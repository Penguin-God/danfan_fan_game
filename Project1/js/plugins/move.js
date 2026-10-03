/*:
 * @target MZ
 * @plugindesc (v1.0) 이동 플러그인. 8방향 + 미세이동
 * @author 펭귄갓
 * @version 1.0
 */

// 키입력 8방향 받도록 변경
Game_Player.prototype.getInputDirection = function() {
    return Input.dir8;
};

// 상하좌우 미세이동
Game_CharacterBase.prototype.moveStraight = function(d) {
    this.setDirection(d);
    const step = this.distancePerFrame(); // 1프레임당 이동 거리 (약 0.0625 타일)
    
    if (d === 2) this._y += step; // 하
    if (d === 4) this._x -= step; // 좌
    if (d === 6) this._x += step; // 우
    if (d === 8) this._y -= step; // 상
    
    this.increaseSteps();
};

// 1. 대각선 이동 시 좌표 미세 갱신 (피타고라스 보정 포함)
Game_CharacterBase.prototype.moveDiagonally = function(horz, vert) {
    this.setDirection(this._direction === 8 || this._direction === 2 ? vert : horz);
    const step = this.distancePerFrame() * 0.7071;
    
    if (horz === 4) this._x -= step;
    if (horz === 6) this._x += step;
    if (vert === 2) this._y += step;
    if (vert === 8) this._y -= step;

    this.increaseSteps();
};

// 2. 방향 번호에 따라 직선/대각선 분기 (MZ 전용)
Game_Player.prototype.executeMove = function(direction) {
    if (direction % 2 === 0) {
        // 2, 4, 6, 8 (상하좌우 직선 이동)
        this.moveStraight(direction);
    } else if (direction === 1) {
        this.moveDiagonally(4, 2); // 좌하
    } else if (direction === 3) {
        this.moveDiagonally(6, 2); // 우하
    } else if (direction === 7) {
        this.moveDiagonally(4, 8); // 좌상
    } else if (direction === 9) {
        this.moveDiagonally(6, 8); // 우상
    }
};

// 매 프레임 업데이트되는 곳에 넣을 임시 함수 (원리 파악용)
Game_Player.prototype.checkOverlapEvent = function() {
    // 1. 현재 맵의 모든 이벤트를 돌면서 플레이어와 좌표 차이가 1칸(1.0) 미만인 것을 찾음
    const overlapEvents = $gameMap.events().filter(event => {
        const dx = Math.abs(this._x - event._x);
        const dy = Math.abs(this._y - event._y);
        return (dx < 1.0) && (dy < 1.0); // 사각형 중심 기준 겹침 판정
    });

    if (overlapEvents.length > 0) {
        const target = overlapEvents[0]; // 겹친 이벤트 중 첫 번째
        // 2. 이벤트 메모란에 적어둔 <이름:OOO> 태그 정보 가져오기
        const targetName = target.event().meta.이름; 
        
        if (targetName) {
            // 이 targetName 변수로 텍스트 알림 UI를 화면에 띄웁니다.
            console.log("현재 겹친 물건:", targetName); 
        }
    }
};

// 충돌 검사를 위해 update갱신
const _Game_Player_update = Game_Player.prototype.update;
Game_Player.prototype.update = function(sceneActive) {
    _Game_Player_update.call(this, sceneActive);
    this.checkOverlapEvent(); // 우리가 만든 겹침 감지 함수를 매 프레임마다 추가로 실행!
};