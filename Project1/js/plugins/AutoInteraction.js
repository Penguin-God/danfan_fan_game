/*:
 * @target MZ
 * @plugindesc (v1.4) 화면 하단 조사 안내 + 줄바꿈 대화창 넘김 + 아이템 자동 획득
 * @author 펭귄갓
 * @version 1.4
 *
 * @command SetupInteraction
 * @text 조사 상호작용 설정
 * @desc 접근 시 화면 하단 텍스트 안내 및 대화/아이템 자동 획득을 설정합니다.
 *
 * @arg PromptText
 * @text 접근 텍스트
 * @type string
 * @default [Z] 조사하기
 * @desc 플레이어가 다가갔을 때 화면 하단에 띄울 안내 문구입니다.
 *
 * @arg PromptImage
 * @text UI 이미지 (선택)
 * @type file
 * @dir img/pictures/
 * @default
 * @desc 텍스트와 함께 띄울 아이콘 이미지입니다. 비워두면 텍스트만 표시됩니다.
 *
 * @arg DialogueText
 * @text 연결할 대사
 * @type multiline_string
 * @default
 * @desc 출력할 대사입니다. 설정한 분할 기준에 따라 다음 대화창으로 순서대로 넘어갑니다.
 *
 * @arg SplitMode
 * @text 대화창 넘김(분할) 기준
 * @type select
 * @option 줄바꿈(엔터 1번)마다 다음 대화창
 * @value line
 * @option 빈 줄(엔터 2번)마다 다음 대화창
 * @value empty_line
 * @option 4줄마다 다음 대화창
 * @value four_lines
 * @default line
 * @desc 대사를 어떤 단위로 다음 텍스트 박스로 넘길지 결정합니다.
 *
 * @arg ItemId
 * @text 획득 아이템
 * @type item
 * @default 0
 * @desc 조사 시 획득할 아이템을 선택합니다. (0이면 없음)
 *
 * @arg ItemCount
 * @text 획득 수량
 * @type number
 * @min 1
 * @default 1
 * @desc 획득할 아이템 개수입니다.
 *
 * @arg SelfSwitch
 * @text 획득 후 셀프 스위치
 * @type select
 * @option 사용 안 함
 * @value none
 * @option 셀프 스위치 A ON
 * @value A
 * @option 셀프 스위치 B ON
 * @value B
 * @default A
 * @desc 조사 완료 후 다음 페이지로 넘기기 위한 셀프 스위치입니다.
 *
 * @arg Distance
 * @text 감지 거리 (타일)
 * @type number
 * @decimals 1
 * @default 1.0
 * @desc 상호작용 가능한 거리입니다. (기본값: 1.0)
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "AutoInteraction";
    const WAIT_MODE = "autoInteractionMessage";

    // ---------------------------------------------------------
    // 1. 대사 텍스트를 대화창 페이지 단위로 쪼개는 함수
    // ---------------------------------------------------------
    function parseDialoguePages(text, splitMode) {
        if (!text || !text.trim()) return [];

        const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const pages = [];

        if (splitMode === "line") {
            // 엔터 1번마다 각각 다음 대화창으로 분할
            const lines = normalized.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                pages.push([line]);
            }
        } else if (splitMode === "empty_line") {
            // 빈 줄(엔터 2번)을 기준으로 대화창 분할
            const blocks = normalized.split(/\n\s*\n/);
            for (const block of blocks) {
                const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length > 0) pages.push(lines);
            }
        } else if (splitMode === "four_lines") {
            // 알만툴 규격인 4줄 단위로 자동 분할
            const lines = normalized.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            for (let i = 0; i < lines.length; i += 4) {
                pages.push(lines.slice(i, i + 4));
            }
        }

        return pages;
    }

    // ---------------------------------------------------------
    // 2. 화면 하단 안내 텍스트/UI 스프라이트
    // ---------------------------------------------------------
    class Sprite_BottomInteractionPrompt extends Sprite {
        initialize() {
            super.initialize();
            this.bitmap = new Bitmap(450, 54);
            this.anchor.x = 0.5;
            this.anchor.y = 1.0;
            this.visible = false;
            this._currentText = "";
            this._currentImage = "";
        }

        setData(text, image) {
            if (this._currentText === text && this._currentImage === image) return;
            this._currentText = text;
            this._currentImage = image;
            this.redraw();
        }

        redraw() {
            const b = this.bitmap;
            b.clear();
            if (!this._currentText && !this._currentImage) return;

            b.fontFace = $gameSystem.mainFontFace();
            b.fontSize = 17;

            const textWidth = b.measureTextWidth(this._currentText);
            const iconPadding = this._currentImage ? 36 : 0;
            const boxWidth = Math.min(b.width, Math.max(120, textWidth + iconPadding + 36));
            const boxHeight = 38;
            const boxX = (b.width - boxWidth) / 2;
            const boxY = b.height - boxHeight;

            const ctx = b.context;
            ctx.save();
            ctx.fillStyle = "rgba(18, 22, 30, 0.85)";
            ctx.strokeStyle = "rgba(220, 230, 245, 0.85)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
            } else {
                ctx.rect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            if (this._currentImage) {
                const imgBitmap = ImageManager.loadPicture(this._currentImage);
                imgBitmap.addLoadListener(() => {
                    b.blt(imgBitmap, 0, 0, imgBitmap.width, imgBitmap.height, boxX + 10, boxY + 5, 28, 28);
                    b.textColor = "#ffffff";
                    b.outlineColor = "rgba(0, 0, 0, 0.9)";
                    b.outlineWidth = 3;
                    b.drawText(this._currentText, boxX + 42, boxY, boxWidth - 48, boxHeight, "left");
                });
            } else {
                b.textColor = "#ffffff";
                b.outlineColor = "rgba(0, 0, 0, 0.9)";
                b.outlineWidth = 3;
                b.drawText(this._currentText, boxX, boxY, boxWidth, boxHeight, "center");
            }
        }
    }

    // ---------------------------------------------------------
    // 3. 이벤트 페이지 감지 및 미세 거리 계산
    // ---------------------------------------------------------
    const _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        this.setupInteractionConfig();
    };

    Game_Event.prototype.setupInteractionConfig = function() {
        this._interactionConfig = null;
        const list = this.list();
        if (!list) return;

        for (const cmd of list) {
            if (cmd.code === 357 && cmd.parameters[0] === PLUGIN_NAME && cmd.parameters[1] === "SetupInteraction") {
                const args = cmd.parameters[3] || {};
                this._interactionConfig = {
                    promptText: args.PromptText || "[Z] 조사하기",
                    promptImage: args.PromptImage || "",
                    distance: Number(args.Distance || 1.0)
                };
                break;
            }
        }
    };

    function isNear(event) {
        if (!event.page() || !event._interactionConfig) return false;
        const dx = Math.abs($gamePlayer._realX - event._realX);
        const dy = Math.abs($gamePlayer._realY - event._realY);
        return dx <= event._interactionConfig.distance && dy <= event._interactionConfig.distance;
    }

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._bottomPromptSprite = new Sprite_BottomInteractionPrompt();
        this._bottomPromptSprite.x = Graphics.boxWidth / 2;
        this._bottomPromptSprite.y = Graphics.boxHeight - 30;
        this.addChild(this._bottomPromptSprite);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateAutoInteraction();
    };

    Scene_Map.prototype.updateAutoInteraction = function() {
        const sprite = this._bottomPromptSprite;
        if (!sprite) return;

        if ($gameMessage.isBusy() || $gameMap.isEventRunning()) {
            sprite.visible = false;
            return;
        }

        let closestEvent = null;
        let minDistance = Infinity;

        for (const event of $gameMap.events()) {
            if (event._interactionConfig && isNear(event)) {
                const dist = Math.hypot($gamePlayer._realX - event._realX, $gamePlayer._realY - event._realY);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestEvent = event;
                }
            }
        }

        if (closestEvent) {
            sprite.setData(closestEvent._interactionConfig.promptText, closestEvent._interactionConfig.promptImage);
            sprite.visible = true;

            const isTouchOnTarget = TouchInput.isTriggered() &&
                Math.abs(TouchInput.x - closestEvent.screenX()) < 36 &&
                Math.abs(TouchInput.y - (closestEvent.screenY() - 24)) < 36;

            if (Input.isTriggered("ok") || isTouchOnTarget) {
                sprite.visible = false;
                closestEvent.start();
            }
        } else {
            sprite.visible = false;
        }
    };

    // ---------------------------------------------------------
    // 4. 플러그인 명령: 큐(Queue) 등록 및 순차 대기 모드 진입
    // ---------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "SetupInteraction", function(args) {
        const eventId = this._eventId;
        const itemId = Number(args.ItemId || 0);
        const itemCount = Math.max(1, Number(args.ItemCount || 1));
        const selfSwitch = args.SelfSwitch || "none";
        const dialogue = args.DialogueText || "";
        const splitMode = args.SplitMode || "line";

        // 1. 아이템 지급
        if (itemId > 0 && $dataItems[itemId]) {
            $gameParty.gainItem($dataItems[itemId], itemCount);
        }

        // 2. 셀프 스위치 조작
        if (selfSwitch !== "none" && eventId > 0) {
            $gameSelfSwitches.setValue([$gameMap.mapId(), eventId, selfSwitch], true);
        }

        // 3. 대사를 페이지 단위로 분할하여 큐에 삽입
        const pages = parseDialoguePages(dialogue, splitMode);
        if (pages.length > 0) {
            this._interactionMessageQueue = pages;

            // 첫 번째 텍스트 박스 출력
            const firstPage = this._interactionMessageQueue.shift();
            for (const line of firstPage) {
                $gameMessage.add(line);
            }

            // 대화창이 닫힐 때마다 다음 대사를 띄우도록 커스텀 WaitMode 설정
            this.setWaitMode(WAIT_MODE);
        }
    });

    // ---------------------------------------------------------
    // 5. 커스텀 WaitMode 루프: 이전 창이 닫히면 다음 창을 자동 오픈
    // ---------------------------------------------------------
    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === WAIT_MODE) {
            // 현재 대화창이 열려 있거나 플레이어 입력을 기다리는 중이면 계속 대기
            if ($gameMessage.isBusy()) {
                return true;
            }

            // 플레이어가 Z키를 눌러 창이 닫혔는데 다음 대사가 남아있다면 다음 창 오픈
            if (this._interactionMessageQueue && this._interactionMessageQueue.length > 0) {
                const nextLines = this._interactionMessageQueue.shift();
                for (const line of nextLines) {
                    $gameMessage.add(line);
                }
                return true;
            }

            // 모든 텍스트 박스 재생 완료
            this._waitMode = "";
            return false;
        }

        return _Game_Interpreter_updateWaitMode.call(this);
    };

})();