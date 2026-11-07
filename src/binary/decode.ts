/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp Binary Node Deserialization Engine
 */

import { SINGLE_BYTE_TOKENS, TAGS } from './constants.js';
import type { BinaryNode } from './encode.js';

export function decodeBinaryNode(buffer: Buffer): BinaryNode {
  let index = 0;
  // If first byte is descriptor version (0 or 2), skip it
  if (buffer[0] === 0 || buffer[0] === 2) {
    index = 1;
  }

  function readByte(): number {
    return buffer[index++];
  }

  function readBytes(n: number): Buffer {
    const slice = buffer.subarray(index, index + n);
    index += n;
    return slice;
  }

  function readInt16(): number {
    const val = (buffer[index] << 8) | buffer[index + 1];
    index += 2;
    return val;
  }

  function readInt20(): number {
    const val = ((buffer[index] & 0x0f) << 16) | (buffer[index + 1] << 8) | buffer[index + 2];
    index += 3;
    return val;
  }

  function readInt32(): number {
    const val =
      (buffer[index] << 24) |
      (buffer[index + 1] << 16) |
      (buffer[index + 2] << 8) |
      buffer[index + 3];
    index += 4;
    return val;
  }

  function readString(): string {
    const tag = readByte();
    if (tag < TAGS.DICTIONARY_0) {
      return SINGLE_BYTE_TOKENS[tag] || '';
    }

    if (tag === TAGS.BINARY_8) {
      const len = readByte();
      return readBytes(len).toString('utf-8');
    }

    if (tag === TAGS.BINARY_20) {
      const len = readInt20();
      return readBytes(len).toString('utf-8');
    }

    if (tag === TAGS.BINARY_32) {
      const len = readInt32();
      return readBytes(len).toString('utf-8');
    }

    if (tag === TAGS.JID_PAIR) {
      const user = readString();
      const server = readString();
      return `${user}@${server}`;
    }

    return '';
  }

  function readListSize(tag: number): number {
    if (tag === TAGS.LIST_EMPTY) return 0;
    if (tag === TAGS.LIST_8) return readByte();
    if (tag === TAGS.LIST_16) return readInt16();
    return 0;
  }

  function readNode(): BinaryNode {
    const listTag = readByte();
    const listSize = readListSize(listTag);
    if (listSize === 0) {
      return { tag: '' };
    }

    const tag = readString();
    const attrs: { [key: string]: string } = {};

    let remaining = listSize - 1;
    while (remaining > 1) {
      const k = readString();
      const v = readString();
      attrs[k] = v;
      remaining -= 2;
    }

    let content: any = undefined;
    if (remaining === 1) {
      const nextTag = buffer[index];
      if (nextTag === TAGS.LIST_EMPTY || nextTag === TAGS.LIST_8 || nextTag === TAGS.LIST_16) {
        const childTag = readByte();
        const count = readListSize(childTag);
        const children: BinaryNode[] = [];
        for (let i = 0; i < count; i++) {
          children.push(readNode());
        }
        content = children;
      } else if (nextTag === TAGS.BINARY_8) {
        readByte();
        const len = readByte();
        content = readBytes(len);
      } else if (nextTag === TAGS.BINARY_20) {
        readByte();
        const len = readInt20();
        content = readBytes(len);
      } else if (nextTag === TAGS.BINARY_32) {
        readByte();
        const len = readInt32();
        content = readBytes(len);
      } else {
        content = readString();
      }
    }

    return { tag, attrs, content };
  }

  return readNode();
}
