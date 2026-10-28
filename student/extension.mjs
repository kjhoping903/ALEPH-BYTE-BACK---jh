/**
 * 케셰브: 14단계 업무 앱 접근 요청 결과 표시.
 * 제공된 입력 계약을 사용하며, 호출자가 표시할 DOM 요소를 반환한다.
 * 공식 학생 모듈의 반환 계약과 화면 연결은 아직 확인되지 않았다.
 * mode는 입력 계약에 포함되지만 판정 의미를 바꾸는 데 사용하지 않는다.
 */
export function renderDecision({ status, mode, data, error, appId }) {
  const result = document.createElement('section');
  result.setAttribute('aria-live', 'polite');
  result.setAttribute('aria-atomic', 'true');

  const addText = (tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    result.appendChild(element);
  };
  const displayText = (value, fallback) =>
    typeof value === 'string' && value.trim() ? value : fallback;

  addText('h2', '업무 앱 접근 요청 결과');

  if (status === 'idle') {
    addText('p', '앱을 골라 접속을 요청하세요.');
    return result;
  }

  const selectedApp = status === 'ok' ? data?.appId ?? appId : appId;
  addText('p', `업무 앱: ${displayText(selectedApp, '확인 불가')}`);

  if (status === 'loading') {
    addText('p', '판정 확인 중');
    return result;
  }

  if (status === 'error') {
    addText('p', `요청 실패: ${displayText(error?.message, '오류 메시지가 제공되지 않았습니다.')}`);
    addText('p', '요청 처리에 실패하여 접근 판정을 확인할 수 없습니다. 접근 거부 판정과는 다릅니다.');
    return result;
  }

  if (status !== 'ok') {
    addText('p', '확인 불가(unknown): 요청 상태를 확인할 수 없습니다.');
    return result;
  }

  const labels = new Map([
    ['allow', '접근 허용(allow)'],
    ['deny', '접근 거부(deny)'],
    ['challenge', '추가 확인 필요(challenge)'],
    ['unknown', '판정 확인 불가(unknown)'],
  ]);
  const decision = labels.has(data?.decision) ? data.decision : 'unknown';
  addText('p', labels.get(decision));
  addText('p', `판정 이유: ${displayText(data?.reason, '제공되지 않았습니다.')}`);
  addText('p', `판정 시각: ${displayText(data?.checkedAt, '제공되지 않았습니다.')}`);

  if (decision === 'allow') {
    addText('p', '정책상 접근이 허용되었습니다. 실제 업무 앱 접속 성공을 보장하지 않습니다.');
  } else if (decision === 'challenge') {
    addText('p', '추가 인증 또는 확인이 필요합니다. 이 앱은 확인 절차를 대신 수행하지 않습니다.');
  } else if (decision === 'unknown') {
    addText('p', '접근 허용 여부를 확인할 수 없습니다.');
  }

  return result;
}
