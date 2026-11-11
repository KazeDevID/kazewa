/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp Binary Node Serialization Engine
 */

import { TAGS, TOKEN_MAP } from './constants.js';

export interface BinaryNode {
  tag: string;
  attrs?: { [key: string]: string };
  content?: BinaryNode[] | string | Buffer | Uint8Array;
}

export function getBinaryNodeChild(node: BinaryNode | undefined, tag: string): BinaryNode | undefined {
  if (!node || !Array.isArray(node.content)) return undefined;
  return node.content.find((child) => child && child.tag === tag);
}

export function getBinaryNodeChildBuffer(node: BinaryNode | undefined, tag: string): Buffer | undefined {
  const child = getBinaryNodeChild(node, tag);
  if (!child) return undefined;
  if (Buffer.isBuffer(child.content)) return child.content;
  if (child.content instanceof Uint8Array) return Buffer.from(child.content);
  if (typeof child.content === 'string') return Buffer.from(child.content, 'utf-8');
  return undefined;
}

export function getBinaryNodeChildren(node: BinaryNode | undefined, tag?: string): BinaryNode[] {
  if (!node || !Array.isArray(node.content)) return [];
  if (!tag) return node.content as BinaryNode[];
  return node.content.filter((child) => child && child.tag === tag);
}

export function encodeBinaryNode(node: BinaryNode): Buffer {
  const buffer: number[] = [0]; // Descriptor version byte
  encodeNodeInner(node, buffer);
  return Buffer.from(buffer);
}

function pushByte(buffer: number[], val: number) {
  buffer.push(val & 0xff);
}

function pushBytes(buffer: number[], bytes: Buffer | Uint8Array | number[]) {
  for (let i = 0; i < bytes.length; i++) {
    buffer.push(bytes[i] & 0xff);
  }
}

function pushInt16(buffer: number[], val: number) {
  buffer.push((val >> 8) & 0xff);
  buffer.push(val & 0xff);
}

function pushInt20(buffer: number[], val: number) {
  buffer.push((val >> 16) & 0x0f);
  buffer.push((val >> 8) & 0xff);
  buffer.push(val & 0xff);
}

function pushInt32(buffer: number[], val: number) {
  buffer.push((val >> 24) & 0xff);
  buffer.push((val >> 16) & 0xff);
  buffer.push((val >> 8) & 0xff);
  buffer.push(val & 0xff);
}

function writeString(str: string, buffer: number[]) {
  const token = TOKEN_MAP[str];
  if (token) {
    if (token.dict === 0) {
      pushByte(buffer, token.index);
    } else {
      pushByte(buffer, TAGS.DICTIONARY_0 + token.dict - 1);
      pushByte(buffer, token.index);
    }
    return;
  }
  const utf8 = Buffer.from(str, 'utf-8');
  writeBytesLength(utf8.length, buffer);
  pushBytes(buffer, utf8);
}

function writeBytesLength(length: number, buffer: number[]) {
  if (length >= 1 << 20) {
    pushByte(buffer, TAGS.BINARY_32);
    pushInt32(buffer, length);
  } else if (length >= 256) {
    pushByte(buffer, TAGS.BINARY_20);
    pushInt20(buffer, length);
  } else {
    pushByte(buffer, TAGS.BINARY_8);
    pushByte(buffer, length);
  }
}

function encodeNodeInner(node: BinaryNode, buffer: number[]) {
  const { tag, attrs, content } = node;
  const attrKeys = attrs ? Object.keys(attrs) : [];

  const hasContent = content !== undefined;
  const listSize = 1 + attrKeys.length * 2 + (hasContent ? 1 : 0);

  if (listSize === 0) {
    pushByte(buffer, TAGS.LIST_EMPTY);
  } else if (listSize < 256) {
    pushByte(buffer, TAGS.LIST_8);
    pushByte(buffer, listSize);
  } else {
    pushByte(buffer, TAGS.LIST_16);
    pushInt16(buffer, listSize);
  }

  // Write Tag
  writeString(tag, buffer);

  // Write Attributes
  for (const k of attrKeys) {
    writeString(k, buffer);
    writeString(attrs![k], buffer);
  }

  // Write Content
  if (content === undefined) {
    return;
  }

  if (typeof content === 'string') {
    writeString(content, buffer);
  } else if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
    writeBytesLength(content.length, buffer);
    pushBytes(buffer, content);
  } else if (Array.isArray(content)) {
    if (content.length === 0) {
      pushByte(buffer, TAGS.LIST_EMPTY);
    } else if (content.length < 256) {
      pushByte(buffer, TAGS.LIST_8);
      pushByte(buffer, content.length);
    } else {
      pushByte(buffer, TAGS.LIST_16);
      pushInt16(buffer, content.length);
    }
    for (const child of content) {
      encodeNodeInner(child, buffer);
    }
  }
}
