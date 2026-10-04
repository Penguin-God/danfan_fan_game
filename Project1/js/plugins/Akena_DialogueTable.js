/*:
 * @target MZ
 * @plugindesc (v1.0) 이미지 + 긴 대사를 목록으로 편집/재생하는 대화 플러그인 <Akena_DialogueTable>
 * @author Akena
 * @version 1.0
 *
 * @help
 * ■ 사용법
 * 이벤트 명령 → 플러그인 명령 → Akena_DialogueTable → 대화 실행
 * 에서 "대사 목록"을 편집합니다.
 *
 * 각 항목에는 딱 두 가지가 있습니다.
 * - 이미지: img/pictures 폴더에서 선택
 * - 대사: 여러 줄 입력
 *
 * 실행하면 항목 순서대로 이미지를 화면 중앙에 표시하고
 * 기본 메시지 창에 대사를 출력합니다.
 * 마지막 대사가 끝나면 이 플러그인이 사용한 그림을 지웁니다.
 *
 * 이미지 파일은 img/pictures 폴더에 넣어 주세요.
 *
 * @command PlayDialogue
 * @text 대화 실행
 * @desc 이미지 + 대사 목록을 위에서부터 순서대로 재생합니다.
 *
 * @arg Lines
 * @text 대사 목록
 * @type struct<DialogueLine>[]
 * @default []
 * @desc 각 항목에 이미지와 긴 대사를 설정합니다.
 */

/*~struct~DialogueLine:
 *
 * @param Image
 * @text 이미지
 * @type file
 * @dir img/pictures/
 * @default
 * @desc 이 대사에서 화면 중앙에 표시할 이미지입니다. 비우면 이미지를 숨깁니다.
 *
 * @param Text
 * @text 대사
 * @type multiline_string
 * @default
 * @desc 메시지 창에 출력할 대사입니다. 여러 줄 입력이 가능합니다.
 */

(() => {
    "use strict";

    const PLUGIN_NAME = "Akena_DialogueTable";
    const WAIT_MODE = "akenaDialogueTable";

    // 이 플러그인이 사용할 RPG Maker 그림 번호입니다.
    const PICTURE_ID = 99;

    // ---------------------------------------------------------
    // MZ가 넘겨주는 struct 배열을 실제 JS 데이터로 변환
    // ---------------------------------------------------------
    function parseLines(raw) {
        try {
            const array = JSON.parse(raw || "[]");

            if (!Array.isArray(array)) {
                return [];
            }

            return array.map(value => {
                let line = value;

                // struct[] 안의 각 항목은 JSON 문자열 형태로 들어옵니다.
                if (typeof value === "string") {
                    line = JSON.parse(value);
                }

                return {
                    image: String(line.Image || ""),
                    text: String(line.Text || "")
                };
            });
        } catch (error) {
            console.error(`[${PLUGIN_NAME}] 대사 목록 파싱 실패`, error);
            return [];
        }
    }

    // ---------------------------------------------------------
    // 이미지 표시
    // ---------------------------------------------------------
    function showLineImage(imageName) {
        // 이미지가 비어 있으면 현재 대화 이미지를 제거
        if (!imageName) {
            $gameScreen.erasePicture(PICTURE_ID);
            return;
        }

        // 원점 1 = 이미지 중앙
        $gameScreen.showPicture(
            PICTURE_ID,
            imageName,
            1,
            Graphics.boxWidth / 2,
            Graphics.boxHeight / 2,
            100,
            100,
            255,
            0
        );
    }

    // ---------------------------------------------------------
    // 대화 종료
    // ---------------------------------------------------------
    function finishDialogue(interpreter) {
        $gameScreen.erasePicture(PICTURE_ID);
        interpreter._akenaDialogueTableState = null;
    }

    // ---------------------------------------------------------
    // 대화 한 줄씩 진행
    // ---------------------------------------------------------
    function updateDialogue(interpreter) {
        const state = interpreter._akenaDialogueTableState;

        if (!state) {
            return false;
        }

        // 현재 대화창이 열려 있으면 기다립니다.
        if ($gameMessage.isBusy()) {
            return true;
        }

        // 전부 재생했으면 종료
        if (state.index >= state.lines.length) {
            finishDialogue(interpreter);
            return false;
        }

        const line = state.lines[state.index++];

        // 해당 행의 이미지 표시
        showLineImage(line.image);

        // 해당 행의 대사 출력
        if (line.text.length > 0) {
            $gameMessage.add(line.text);
        }

        return true;
    }

    // ---------------------------------------------------------
    // 플러그인 명령
    // ---------------------------------------------------------
    PluginManager.registerCommand(PLUGIN_NAME, "PlayDialogue", function(args) {
        const lines = parseLines(args.Lines);

        if (lines.length === 0) {
            return;
        }

        // 현재 이벤트에 대화 진행 상태 저장
        this._akenaDialogueTableState = {
            lines: lines,
            index: 0
        };

        // 이벤트가 대화 종료까지 기다리게 함
        this.setWaitMode(WAIT_MODE);
    });

    // ---------------------------------------------------------
    // 커스텀 WaitMode
    // ---------------------------------------------------------
    const _Game_Interpreter_updateWaitMode = Game_Interpreter.prototype.updateWaitMode;

    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === WAIT_MODE) {
            const waiting = updateDialogue(this);

            if (!waiting) {
                this._waitMode = "";
            }

            return waiting;
        }

        return _Game_Interpreter_updateWaitMode.call(this);
    };

})();