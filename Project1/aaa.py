import os
import json
import re
import shutil
import textwrap

# ============================================================
# [설정]
# 1. 시나리오 커먼 이벤트 시작 번호 (기존 함수 보호 구역)
#    1~100번은 기존 커먼 이벤트 전용으로 유지되고, 101번부터 시나리오가 들어갑니다.
START_ID = 101

# 2. 대화창 한 줄당 최대 글자 수 (30~32자 권장)
MAX_LINE_LENGTH = 32
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEXT_FILE_PATH = os.path.join(BASE_DIR, "새 텍스트 문서.txt")
JSON_FILE_PATH = os.path.join(BASE_DIR, "data", "CommonEvents.json")
BACKUP_FILE_PATH = os.path.join(BASE_DIR, "data", "CommonEvents.json.bak")

def add_message_events(event_list, speaker_name, text_content):
    """텍스트를 단어 단위로 줄바꿈하고, 4줄 단위로 대화창을 분할 생성"""
    clean_text = text_content.strip().strip('"').strip("'")
    clean_text = clean_text.replace('**', '').replace('*', '').strip()
    if not clean_text:
        return

    # 단어가 중간에 잘리지 않도록 줄바꿈 설정
    wrapped_lines = textwrap.wrap(
        clean_text, 
        width=MAX_LINE_LENGTH, 
        break_long_words=False, 
        break_on_hyphens=False
    )
    if not wrapped_lines:
        wrapped_lines = [clean_text]

    # 알만툴 대화창 한계(4줄)에 맞춰 4줄씩 분할
    for i in range(0, len(wrapped_lines), 4):
        chunk = wrapped_lines[i:i + 4]
        # 코드 101 (문장의 표시 설정): [얼굴, 인덱스, 배경, 위치, 화자이름]
        event_list.append({"code": 101, "indent": 0, "parameters": ["", 0, 0, 2, speaker_name]})
        # 코드 401 (대사 라인)
        for line in chunk:
            event_list.append({"code": 401, "indent": 0, "parameters": [line]})

def main():
    # 1. 파일 검증 및 백업
    if not os.path.exists(TEXT_FILE_PATH):
        print(f"[오류] 텍스트 파일을 찾을 수 없습니다: {TEXT_FILE_PATH}")
        return

    if not os.path.exists(JSON_FILE_PATH):
        print(f"[오류] 알만툴 데이터 파일을 찾을 수 없습니다: {JSON_FILE_PATH}")
        return

    # 실행할 때마다 자동 백업 생성
    shutil.copyfile(JSON_FILE_PATH, BACKUP_FILE_PATH)
    print(f"[안전] 원본 백업 완료 -> {BACKUP_FILE_PATH}")

    # 2. 텍스트 읽기 및 파트 분할 (윈도우 줄바꿈, 긴 대시 기호 대응)
    with open(TEXT_FILE_PATH, "r", encoding="utf-8") as f:
        raw_text = f.read()

    chunks = [chunk.strip() for chunk in re.split(r'\r?\n\s*[-—=]{3,}\s*\r?\n', raw_text) if chunk.strip()]

    # 3. 기존 CommonEvents.json 로드
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
        common_events = json.load(f)

    # 필요한 슬롯 크기만큼 배열 확장
    max_needed_id = START_ID + len(chunks) - 1
    while len(common_events) <= max_needed_id:
        new_id = len(common_events)
        common_events.append({
            "id": new_id,
            "name": "",
            "trigger": 0,
            "switchId": 1,
            "list": []
        })

    # 4. 각 파트별 커먼 이벤트 등록
    for i, chunk in enumerate(chunks):
        target_id = START_ID + i
        event_list = []
        lines = chunk.splitlines()
        first_title = ""

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 구분선 기호(---, ------, — 등)만 적힌 줄은 대사 생성에서 완전히 제외
            if re.match(r'^[-—=]{2,}$', line):
                continue

            # [화자]: 대사 패턴 매칭
            speaker_match = re.match(r'^\[(.*?)\]:\s*(.*)$', line)
            if speaker_match:
                speaker = speaker_match.group(1).strip()
                content = speaker_match.group(2).strip()
                if not first_title:
                    clean_preview = content.replace('*', '').replace('"', '').strip()
                    first_title = f"{speaker}: {clean_preview[:14]}"
                add_message_events(event_list, speaker, content)
            else:
                # 나레이션 / 독백
                if not first_title:
                    clean_preview = line.replace('*', '').replace('**', '').strip()
                    first_title = clean_preview[:16]
                add_message_events(event_list, "", line)

        # 이벤트 종료 코드
        event_list.append({"code": 0, "indent": 0, "parameters": []})

        # 지정 슬롯에만 대입 (기존 1~100번 등 다른 슬롯은 보존)
        common_events[target_id] = {
            "id": target_id,
            "name": f"시나리오_{i+1:02d}",
            "trigger": 0,
            "switchId": 1,
            "list": event_list
        }

    # 5. 저장
    with open(JSON_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(common_events, f, ensure_ascii=False, indent=2)

    print(f"[성공] 기존 이벤트 보존 완료! 시나리오 {len(chunks)}개가 커먼 이벤트 {START_ID}번부터 {max_needed_id}번까지 등록되었습니다.")

if __name__ == "__main__":
    main()