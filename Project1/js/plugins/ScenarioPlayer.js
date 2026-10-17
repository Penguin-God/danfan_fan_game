/*:
 * @target MZ
 * @plugindesc (v1.0) 외부 시나리오 JSON 대본 재생기
 * @author 펭귄갓
 * @version 1.0
 
 * @command playPart
 * @text 시나리오 파트 재생
 * @desc 지정한 번호의 대본(뭉탱이)을 커먼 이벤트처럼 순서대로 실행합니다.
 * 
 * @arg partId
 * @text 파트 번호
 * @desc 재생할 시나리오 번호 (1부터 시작)
 * @type number
 * @default 1
 */

// 전역 시나리오 데이터 저장소
window.$scenarioData = null;

(() => {
    // 실제 파일명 자동 감지 (파일명 대소문자 문제 완전 방지)
    const pluginName = document.currentScript ? 
        decodeURIComponent(document.currentScript.src.match(/^.*\/(.+)\.js$/)[1]) : "ScenarioPlayer";

    // 1. 알만툴 MZ 표준 방식으로 data/ScenarioData.json 로드
    const _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        DataManager.loadDataFile("$scenarioData", "ScenarioData.json");
    };

    // 2. 플러그인 명령 등록
    PluginManager.registerCommand(pluginName, "playPart", function(args) {
        const partId = Number(args.partId);

        if (!$scenarioData || !$scenarioData[partId]) {
            console.warn(`[${pluginName}] ${partId}번 파트 데이터가 존재하지 않습니다.`);
            return;
        }

        // 현재 맵 이벤트 인터프리터에 시나리오 이벤트 리스트 실행
        const eventId = this.isOnCurrentMap() ? this._eventId : 0;
        this.setupChild($scenarioData[partId], eventId);
    });
})();