/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * WhatsApp Binary Node Serialization Engine
 */
export interface BinaryNode {
    tag: string;
    attrs?: {
        [key: string]: string;
    };
    content?: BinaryNode[] | string | Buffer | Uint8Array;
}
export declare function encodeBinaryNode(node: BinaryNode): Buffer;
//# sourceMappingURL=encode.d.ts.map