/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp Binary Node Serialization Engine
 */
import { TAGS, TOKEN_MAP } from './constants.js';
export function encodeBinaryNode(node) {
    const buffer = [0]; // Descriptor version byte
    encodeNodeInner(node, buffer);
    return Buffer.from(buffer);
}
function pushByte(buffer, val) {
    buffer.push(val & 0xff);
}
function pushBytes(buffer, bytes) {
    for (let i = 0; i < bytes.length; i++) {
        buffer.push(bytes[i] & 0xff);
    }
}
function pushInt16(buffer, val) {
    buffer.push((val >> 8) & 0xff);
    buffer.push(val & 0xff);
}
function pushInt20(buffer, val) {
    buffer.push((val >> 16) & 0x0f);
    buffer.push((val >> 8) & 0xff);
    buffer.push(val & 0xff);
}
function pushInt32(buffer, val) {
    buffer.push((val >> 24) & 0xff);
    buffer.push((val >> 16) & 0xff);
    buffer.push((val >> 8) & 0xff);
    buffer.push(val & 0xff);
}
function writeString(str, buffer) {
    const token = TOKEN_MAP[str];
    if (token) {
        if (token.dict === 0) {
            pushByte(buffer, token.index);
        }
        else {
            pushByte(buffer, TAGS.DICTIONARY_0 + token.dict - 1);
            pushByte(buffer, token.index);
        }
        return;
    }
    const utf8 = Buffer.from(str, 'utf-8');
    writeBytesLength(utf8.length, buffer);
    pushBytes(buffer, utf8);
}
function writeBytesLength(length, buffer) {
    if (length >= 1 << 20) {
        pushByte(buffer, TAGS.BINARY_32);
        pushInt32(buffer, length);
    }
    else if (length >= 256) {
        pushByte(buffer, TAGS.BINARY_20);
        pushInt20(buffer, length);
    }
    else {
        pushByte(buffer, TAGS.BINARY_8);
        pushByte(buffer, length);
    }
}
function encodeNodeInner(node, buffer) {
    const { tag, attrs, content } = node;
    const attrKeys = attrs ? Object.keys(attrs) : [];
    // Determine list size: 1 (for tag) + 2 * attrs.length + (content !== undefined ? 1 : 0)
    const hasContent = content !== undefined;
    const listSize = 1 + attrKeys.length * 2 + (hasContent ? 1 : 0);
    if (listSize === 0) {
        pushByte(buffer, TAGS.LIST_EMPTY);
    }
    else if (listSize < 256) {
        pushByte(buffer, TAGS.LIST_8);
        pushByte(buffer, listSize);
    }
    else {
        pushByte(buffer, TAGS.LIST_16);
        pushInt16(buffer, listSize);
    }
    // Write Tag
    writeString(tag, buffer);
    // Write Attributes
    for (const k of attrKeys) {
        writeString(k, buffer);
        writeString(attrs[k], buffer);
    }
    // Write Content
    if (content === undefined) {
        return;
    }
    if (typeof content === 'string') {
        writeString(content, buffer);
    }
    else if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
        writeBytesLength(content.length, buffer);
        pushBytes(buffer, content);
    }
    else if (Array.isArray(content)) {
        if (content.length === 0) {
            pushByte(buffer, TAGS.LIST_EMPTY);
        }
        else if (content.length < 256) {
            pushByte(buffer, TAGS.LIST_8);
            pushByte(buffer, content.length);
        }
        else {
            pushByte(buffer, TAGS.LIST_16);
            pushInt16(buffer, content.length);
        }
        for (const child of content) {
            encodeNodeInner(child, buffer);
        }
    }
}
//# sourceMappingURL=encode.js.map