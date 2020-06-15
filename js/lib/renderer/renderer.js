"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = exports.Alignment = void 0;
var Alignment;
(function (Alignment) {
    Alignment["LEFT"] = "left";
    Alignment["MIDDLE"] = "middle";
    Alignment["RIGHT"] = "right";
})(Alignment = exports.Alignment || (exports.Alignment = {}));
var Renderer = /** @class */ (function () {
    function Renderer(container) {
        this.container = container;
    }
    return Renderer;
}());
exports.Renderer = Renderer;
//# sourceMappingURL=renderer.js.map