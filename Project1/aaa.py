import os
import json
import re
import textwrap

# ============================================================
# [설정] 한 줄당 최대 글자 수 (해상도에 따라 조절)
# - 기본 해상도(816x624) 기준: 30 ~ 32자 권장
# - HD 해상도(1280x720) 기준: 40 ~ 45자 권장
MAX_LINE_LENGTH = 32
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEXT_FILE_PATH = os.path.join(BASE_DIR, "새 텍스트 문서.txt")
JSON_FILE_PATH = os.path.join(BASE_DIR, "data", "CommonEvents.json")

def add_message_events(event_list, speaker_name, text_content):
    """긴 문장을 적절한 길이로 줄바꿈하고, 4줄 단위로 대화창을 분할하는 함수"""
    # 따옴표 및 마크다운 서식 정리
    clean_text = text_content.strip().strip('"').strip("'")
    clean_text = clean_text.replace('**', '').replace('*', '').strip()
    
    if not clean_text:
        return

    # 글자 수 기준으로 자연스럽게 단어 단위 줄바꿈
    wrapped_lines = textwrap.wrap(clean_text, width=MAX_LINE_LENGTH, break_long_words=True)
    if not wrapped_lines:
        wrapped_lines = [clean_text]

    # 알만툴 대화창 한계(최대 4줄)에 맞춰 4줄씩 분할 생성
    for i in range(0, len(wrapped_lines), 4):
        chunk = wrapped_lines[i:i + 4]
        # 코드 101 (문장의 표시 설정): [얼굴, 인덱스, 배경, 위치, 화자이름]
        event_list.append({"code": 101, "indent": 0, "parameters": ["", 0, 0, 2, speaker_name]})
        # 코드 401 (대사 라인)
        for line in chunk:
            event_list.append({"code": 401, "indent": 0, "parameters": [line]})

# 1. 텍스트 읽기
with open(TEXT_FILE_PATH, "r", encoding="utf-8") as f:
    raw_text = f.read()

# 2. '---' 구분선 기준으로 파트 분할
chunks = [chunk.strip() for chunk in re.split(r'\n\s*-{3,}\s*\n', raw_text) if chunk.strip()]

# 3. JSON 읽기
with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
    common_events = json.load(f)

start_id = 1

for i, chunk in enumerate(chunks):
    target_id = start_id + i
    
    while len(common_events) <= target_id:
        common_events.append(None)
        
    event_list = []
    lines = chunk.splitlines()
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # 화자 이름 패턴: [이름]: 대사
        speaker_match = re.match(r'^\[(.*?)\]:\s*(.*)$', line)
        
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            content = speaker_match.group(2).strip()
            add_message_events(event_list, speaker, content)
        else:
            # 나레이션 및 독백 (화자 없음)
            add_message_events(event_list, "", line)
            
    # 이벤트 종료 코드
    event_list.append({"code": 0, "indent": 0, "parameters": []})
    
    common_events[target_id] = {
        "id": target_id,
        "name": f"시나리오_파트_{i+1:02d}",
        "trigger": 0,
        "switchId": 1,
        "list": event_list
    }

# 4. JSON 파일 저장
with open(JSON_FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(common_events, f, ensure_ascii=False, indent=2)

print(f"총 {len(chunks)}개 파트 변환 완료! (자동 줄바꿈 및 4줄 분할 적용)")