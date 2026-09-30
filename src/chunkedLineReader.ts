import * as fs from 'fs';
import { logDebug } from './logger';

/**
 * Bytes per disk read. A transcript can reach hundreds of MB; reading the appended region into one
 * Buffer and decoding it into one string overflows V8's string limit (~512 MiB), which threw, was
 * swallowed into an empty session and was retried on every tick and flush. Reading in chunks bounds
 * one read; MAX_LINE_BYTES bounds what a single line may add up to.
 */
export const READ_CHUNK_BYTES = 8 * 1024 * 1024;

/**
 * Longest single line kept, in bytes. The chunk bounds one read, not the line assembled from many: a
 * runaway line (or an unterminated tail) would be copied into memory whole, decoded into one string
 * that throws past V8's ~512 MiB limit and, with the cursor stuck behind it, redone on every tick. A
 * longer line is dropped whole and the cursor moves past it. At least one chunk and far below that
 * limit; no real transcript line comes close (the largest transcript FILE seen is 56 MB).
 */
export const MAX_LINE_BYTES = 64 * 1024 * 1024;

const NEWLINE = 0x0a;

export interface ChunkedRead {
  readonly fd: number;
  /** First byte to read. */
  readonly start: number;
  /** One past the last byte to read. */
  readonly end: number;
  readonly chunkBytes: number;
  /** Longest line kept; a longer one is dropped whole. */
  readonly maxLineBytes: number;
}

/**
 * Hands every COMPLETE line of bytes [start, end) of an open file to `onLine`, in order, reading at
 * most `chunkBytes` per `fs.readSync` and decoding each line on its own as UTF-8.
 *
 * Lines are split on the raw newline BYTE (0x0A) and only then decoded. 0x0A never occurs inside a
 * multi-byte UTF-8 sequence, so a character straddling a chunk boundary can't be cut in half, and
 * every offset here is a byte offset by construction — no UTF-16 `.length` arithmetic, which would
 * land a retry mid-character on transcripts carrying accents or emoji.
 *
 * A line over `maxLineBytes`, or one that cannot be decoded, is skipped instead of handed over; one
 * debug line per call says how much (byte counts only — the caller knows the path). Skipped bytes
 * count as consumed, so neither they nor the lines before them are ever read or handed over twice.
 *
 * Returns the byte offset the next read should resume from: the START of the trailing fragment that
 * has no newline yet, or the end of what was read when that ends on a newline or inside a line being
 * dropped. A writer caught mid-line leaves such a fragment; it must not be handed over now, and the
 * cursor must not move past it, or the real entry would be lost for good — the next read would start
 * mid-JSON and never resync. Memory is bounded by one chunk plus a few times `maxLineBytes` (the
 * carried copy, the concatenated line and its decoded string coexist).
 */
export function readLinesInChunks(
  { fd, start, end, chunkBytes, maxLineBytes }: ChunkedRead,
  onLine: (line: string) => void,
): number {
  // Never bigger than the range: the common case is a few hundred appended bytes, not a full chunk.
  const chunk = Buffer.allocUnsafe(Math.min(chunkBytes, end - start));
  const lines = new LineAssembler(maxLineBytes, onLine);
  let position = start;

  while (position < end) {
    // The part of the chunk still worth filling: the last read stops at `end`, not at a chunk boundary.
    const toFill = chunk.subarray(0, Math.min(chunk.length, end - position));
    const bytesRead = readChunk(fd, toFill, position);
    if (bytesRead === 0) break;
    lines.feed(toFill.subarray(0, bytesRead));
    position += bytesRead;
  }
  if (lines.skippedLines > 0) {
    logDebug(
      `Skipped ${lines.skippedLines} line(s), ${lines.skippedBytes} bytes: over the ${maxLineBytes}-byte line limit or not decodable`,
    );
  }
  return position - lines.pendingBytes;
}

/** One bounded read. 0 means nothing more can be read: EOF (the file shrank since `stat`) or an I/O error. */
function readChunk(fd: number, toFill: Buffer, position: number): number {
  try {
    return fs.readSync(fd, toFill, 0, toFill.length, position);
  } catch (err) {
    // Stop and keep the progress made so far instead of throwing: lines from earlier chunks were
    // already handed over, and a throw would leave the caller's cursor behind them — the retry
    // would then feed the same lines a second time. No path here: only the caller knows it.
    logDebug(`Transcript read failed at byte ${position}: ${String(err)}; will resume from the last complete line`);
    return 0;
  }
}

/** Turns consecutive chunks of bytes into lines, never holding more than `maxLineBytes` of an unfinished one. */
class LineAssembler {
  /** Bytes of the unfinished line held back: the cursor sits this far behind the last byte fed. */
  pendingBytes = 0;
  skippedLines = 0;
  skippedBytes = 0;
  private readonly carried: Buffer[] = [];
  // True from the moment a line turns out to be over the limit until its newline: the rest is dropped unread.
  private discarding = false;
  private readonly maxLineBytes: number;
  private readonly onLine: (line: string) => void;

  constructor(maxLineBytes: number, onLine: (line: string) => void) {
    this.maxLineBytes = maxLineBytes;
    this.onLine = onLine;
  }

  /** Consumes the next chunk: hands over every line it completes, holds back or drops the rest. */
  feed(data: Buffer): void {
    let from = 0;
    while (from < data.length) {
      const newline = data.indexOf(NEWLINE, from);
      const end = newline === -1 ? data.length : newline;
      this.take(data.subarray(from, end), newline !== -1);
      from = end + 1;
    }
  }

  /** `segment`: the current line's bytes inside this chunk; `endsLine`: its newline follows them. */
  private take(segment: Buffer, endsLine: boolean): void {
    if (this.discarding || this.pendingBytes + segment.length > this.maxLineBytes) {
      this.drop(segment, endsLine);
    } else if (endsLine) {
      // Only the first line of a chunk can have a prefix carried over from the previous one.
      const line = this.carried.length === 0 ? segment : Buffer.concat([...this.carried.splice(0), segment]);
      this.pendingBytes = 0;
      this.emit(line);
    } else {
      // `segment` is a view on the chunk, which the next read overwrites: copy what has to outlive it.
      this.carried.push(Buffer.from(segment));
      this.pendingBytes += segment.length;
    }
  }

  /** Drops `segment` and whatever was held back for the same line; the rest of it follows until its newline. */
  private drop(segment: Buffer, endsLine: boolean): void {
    if (!this.discarding) this.skippedLines += 1; // counted once, when it first turns out to be too long
    this.skippedBytes += this.pendingBytes + segment.length + (endsLine ? 1 : 0);
    this.carried.length = 0;
    this.pendingBytes = 0;
    this.discarding = !endsLine;
  }

  private emit(line: Buffer): void {
    let text: string;
    try {
      text = line.toString('utf8');
    } catch {
      // A string the runtime cannot build (too long, or no memory left): skip this line, keep reading.
      this.skippedLines += 1;
      this.skippedBytes += line.length + 1;
      return;
    }
    this.onLine(text);
  }
}
