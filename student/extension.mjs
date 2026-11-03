// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('div');
      const deviceStatus = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const sessionStatus = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const add = (parent, tag, value) => {
        const element = document.createElement(tag);
        element.textContent = value;
        parent.append(element);
        return element;
      };
      const showResource = (title, resource, showData) => {
        const section = document.createElement('section');
        add(section, 'h3', title);
        const mode = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' }[resource.mode];
        if (mode) add(section, 'p', mode);
        if (resource.status === 'loading') add(section, 'p', '불러오는 중');
        else if (resource.status === 'error') add(section, 'p', `연결 실패: ${resource.error?.message || '확인 불가'}`);
        else if (resource.status === 'ok') showData(section, resource.data);
        else add(section, 'p', '확인 불가');
        root.append(section);
      };

      showResource('현재 계정', me, (section, data) => {
        add(section, 'p', `사용자: ${data.user.label} (ID: ${data.user.id})`);
        add(section, 'p', `현재 기기: ${data.device.label} (ID: ${data.device.id}) · ${deviceStatus[data.device.status] || '확인 불가'}`);
        add(section, 'p', `로그인 세션: ${data.session.id} · ${sessionStatus[data.session.status] || '확인 불가'}`);
      });
      showResource('기기 목록', devices, (section, data) => {
        if (data.length === 0) return add(section, 'p', '기기 없음');
        const list = document.createElement('ul');
        for (const device of data) add(list, 'li', `${device.label} (ID: ${device.id}) · ${deviceStatus[device.status] || '확인 불가'}`);
        section.append(list);
      });
      showResource('세션 목록', sessions, (section, data) => {
        if (data.length === 0) return add(section, 'p', '세션 없음');
        const list = document.createElement('ul');
        for (const session of data) add(list, 'li', `${session.id} · ${sessionStatus[session.status] || '확인 불가'}`);
        section.append(list);
      });
      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('div');
      const add = (label, value) => {
        const line = document.createElement('p');
        line.textContent = label ? `${label}: ${value}` : value;
        root.append(line);
      };
      if (mode === 'demo') add('', '예제 자료');
      else if (mode === 'disconnected') add('', '연결 없음');
      else if (mode === 'unknown') add('', '확인 불가');

      if (status === 'idle') add('', '앱을 골라 접속을 요청하세요.');
      else if (status === 'loading') {
        if (appId) add('요청 앱 ID', appId);
        add('', '판정 확인 중');
      } else if (status === 'error') {
        if (appId) add('요청 앱 ID', appId);
        add('', `요청 실패: ${error?.message || '확인 불가'}`);
        add('', '요청 실패는 접근 거부 판정이 아닙니다.');
      } else if (status === 'ok' && data) {
        add('판정 앱 ID', data.appId);
        const decisions = {
          allow: '접근 허용(allow)',
          deny: '접근 거부(deny)',
          challenge: '추가 인증 또는 확인 필요(challenge)',
          unknown: '판정 확인 불가(unknown)',
        };
        add('접근 판정', Object.hasOwn(decisions, data.decision) ? decisions[data.decision] : decisions.unknown);
        if (data.decision === 'challenge') add('', '이 앱은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        add('판정 이유', data.reason || '이유 정보 없음');
        add('판정 시각', data.checkedAt || '시각 정보 없음');
      } else add('', '판정 확인 불가(unknown)');
      return root;
    },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
