/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Kazewa WhatsApp Web Bot API & Protocol Library
 * Pure standalone type definitions
 */
export var DisconnectReason;
(function (DisconnectReason) {
    DisconnectReason[DisconnectReason["loggedOut"] = 401] = "loggedOut";
    DisconnectReason[DisconnectReason["forbidden"] = 403] = "forbidden";
    DisconnectReason[DisconnectReason["timedOut"] = 408] = "timedOut";
    DisconnectReason[DisconnectReason["connectionClosed"] = 428] = "connectionClosed";
    DisconnectReason[DisconnectReason["connectionLost"] = 408] = "connectionLost";
    DisconnectReason[DisconnectReason["connectionReplaced"] = 440] = "connectionReplaced";
    DisconnectReason[DisconnectReason["badSession"] = 500] = "badSession";
    DisconnectReason[DisconnectReason["restartRequired"] = 515] = "restartRequired";
    DisconnectReason[DisconnectReason["multideviceMismatch"] = 411] = "multideviceMismatch";
    DisconnectReason[DisconnectReason["unavailableService"] = 503] = "unavailableService";
})(DisconnectReason || (DisconnectReason = {}));
//# sourceMappingURL=index.js.map