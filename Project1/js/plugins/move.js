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

    // 이동마다 충돌 이벤트 검사
    if (direction !== 0) {
        this.checkEventTriggerTouch(this._x, this._y);
    }
};

// 1. 공통 겹침(AABB) 판정 함수 추가
Game_CharacterBase.prototype.isOverlapping = function(event) {
    // 타일 칸(x, y)이 아닌 실제 픽셀 좌표(_realX, _realY) 기준 계산
    const dx = Math.abs(this._realX - event._realX);
    const dy = Math.abs(this._realY - event._realY);
    return dx < 0.8 && dy < 0.8; // 0.8 타일 이내면 겹친 것으로 판정 (조절 가능)
};

// 2. [트리거 0: 결정 버튼] Z키 눌렀을 때 엔진이 부르는 원본 함수 덮어쓰기
Game_Player.prototype.checkEventTriggerHere = function(triggers) {
    if (this.canStartLocalEvents()) {
        for (const event of $gameMap.events()) {
            // 트리거 조건이 맞고, 커서와 겹쳤다면 알만툴 정상 흐름으로 start
            if (event.isTriggerIn(triggers) && this.isOverlapping(event)) {
                event.start();
            }
        }
    }
};

// 3. 커서 마커 방식이므로 바라보는 방향(There) 조사도 제자리(Here) 겹침 판정으로 통합
Game_Player.prototype.checkEventTriggerThere = function(triggers) {
    this.checkEventTriggerHere(triggers); 
};

// 4. [트리거 1, 2: 접촉] 이동 중 엔진이 부르는 원본 함수 덮어쓰기
Game_Player.prototype.checkEventTriggerTouch = function(x, y) {
    if (this.canStartLocalEvents()) {
        for (const event of $gameMap.events()) {
            if (event.isTriggerIn([1, 2]) && this.isOverlapping(event)) {
                if (!event.isStarting()) {
                    event.start();
                }
            }
        }
    }
};