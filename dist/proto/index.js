/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Protobuf Definitions & Helper Factories for WhatsApp Web protocol
 */
export var proto;
(function (proto) {
    proto.Message = {
        fromObject(obj) {
            return { ...obj };
        },
        encode(msg) {
            const json = JSON.stringify(msg);
            const buf = Buffer.from(json, 'utf-8');
            return {
                finish: () => new Uint8Array(buf)
            };
        },
        decode(data) {
            try {
                const str = Buffer.from(data).toString('utf-8');
                return JSON.parse(str);
            }
            catch {
                return {};
            }
        }
    };
    proto.WebMessageInfo = {
        fromObject(obj) {
            return { ...obj };
        }
    };
})(proto || (proto = {}));
//# sourceMappingURL=index.js.map