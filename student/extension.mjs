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
    renderAiConnection({ status, mode, data, error, checkedAt, explanationAccepted }) {
      const root = document.createElement('div');
      const add = (value) => {
        const line = document.createElement('p');
        line.textContent = value;
        root.append(line);
      };
      const modes = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modes, mode)) add(modes[mode]);

      if (status === 'idle') add('AI 연결 점검 전입니다.');
      else if (status === 'loading') add('AI 연결 점검 중입니다.');
      else if (status === 'ok') {
        const authorization = {
          test: '시험 연결 점검(test)',
          verified: '앱 권한 확인 후 점검(verified)',
        };
        add(authorization[data?.audienceAuthorization] || 'AI 연결 점검 결과 확인 불가');
        add(`응답 모델 수: ${data?.modelCount ?? '확인 불가'}`);
        add(`점검 시각: ${checkedAt || '확인 불가'}`);
        add('이 결과는 AI 연결과 모델 응답 점검입니다. 사건 설명은 아직 실행하지 않았습니다.');
      } else if (status === 'error') {
        const advice = {
          ON_AI_PROVISIONING_PENDING: '권한 준비 중입니다. 담당자에게 현재 계정 연결과 앱 권한을 확인해 달라고 요청하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '현재 계정 연결을 확인할 수 없습니다. 담당자에게 계정과 앱 권한을 확인해 달라고 요청하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '앱 권한이 점검 중 변경됐습니다. 담당자에게 현재 권한을 확인해 달라고 요청하세요.',
          WB_CLCO_AUTH_REQUIRED: 'AI 인증에 실패했습니다. 계정 연결을 다시 확인하고 담당자에게 문의하세요.',
          WB_CLCO_ACCESS_BLOCKED: 'AI 접근이 제한됐습니다. 담당자에게 이용 권한을 확인해 달라고 요청하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_SESSION_CLOSED: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: 'AI 요청이 제한됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: 'AI 응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '요청 처리 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '서버 확인 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          TIMEOUT: 'AI 응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_NETWORK_ERROR: 'AI 서버 연결에 실패했습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_SERVER_UNAVAILABLE: 'AI 서버가 응답하지 않습니다. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          CANCELLED: '점검이 취소됐습니다. 이전 결과는 현재 결과가 아닙니다.',
          ON_AI_MODEL_LIST_EMPTY: '사용할 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정을 확인해 달라고 요청하세요.',
          MODEL_NOT_CONFIGURED: '사용할 AI 모델이 설정되지 않았습니다. 담당자에게 확인하세요.',
        };
        const code = Object.hasOwn(advice, error?.code) ? error.code : 'AI_REQUEST_UNVERIFIED';
        add(`AI 연결 점검 실패: ${code} · ${code === error?.code ? error.message : '연결 또는 응답을 확인할 수 없습니다.'}`);
        add(advice[code] || '연결 상태와 앱 권한을 담당자에게 확인해 달라고 요청하세요.');
      } else add('AI 연결 점검 상태 확인 불가');
      if (status !== 'loading') add('다시 점검하려면 현재 API 연결 점검 버튼을 직접 누르세요.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt }) {
      const root = document.createElement('div');
      const add = (value) => {
        const line = document.createElement('p');
        line.textContent = value;
        root.append(line);
      };
      if (explanation?.status === 'error') {
        add(`AI 설명 실패: ${explanation.error?.code || 'AI_REQUEST_UNVERIFIED'} · ${explanation.error?.message || '확인 불가'}`);
        if (explanation.error?.code === 'ON_AI_INVALID_INPUT') add('선택한 기록의 근거와 규칙이 부족하거나 확인되지 않았습니다.');
        if (explanation.error?.code === 'ON_AI_INVALID_OUTPUT') add('AI 설명의 근거 또는 응답 형식이 현재 기록과 맞지 않습니다.');
        add('기록은 그대로 유지됩니다. AI 설명 실패는 과제 실패가 아닙니다.');
        return root;
      }
      if (!event?.id) {
        add('보안 기록에서 기록을 먼저 고르세요.');
        return root;
      }
      if (explanation?.status === 'loading') {
        add('AI 설명 요청 중입니다.');
        return root;
      }
      if (explanation?.status !== 'ok') {
        add('AI 설명은 아직 실행하지 않았습니다.');
        return root;
      }

      const data = explanation.data;
      const evidence = Array.isArray(event.evidence) ? event.evidence : [];
      const cited = data?.evidenceIds;
      const evidenceById = new Map(evidence.map(item => [item.id, item.text]));
      if (!Array.isArray(cited) || cited.length === 0 || cited.some(id => !evidenceById.has(id))
        || data?.executed !== false || data?.requiresHumanConfirmation !== true) {
        add('AI 설명을 사용할 수 없습니다: 근거가 현재 기록과 맞지 않거나 실행 여부를 확인할 수 없습니다.');
        add('기록은 그대로 유지됩니다.');
        return root;
      }

      root.setAttribute('data-student-explanation-event', event.id);
      add('AI 설명(참고용)');
      add(`사건 ID: ${event.id}`);
      add(`AI 요약: ${data.summary}`);
      add('사실 판단은 아래 근거와 연동 시스템의 현재 상태를 기준으로 하세요.');
      add('인용한 근거');
      for (const id of cited) add(`${id} — ${evidenceById.get(id)}`);
      add('현재 규칙');
      for (const rule of event.rules) add(`${rule.id} — ${rule.text}`);
      add('확인되지 않은 현재 상태');
      const stateNames = { access: '접속', session: '세션', device: '기기' };
      const unknown = Object.entries(stateNames).filter(([key]) => event.state?.[key] === 'unknown');
      if (unknown.length === 0) add('없음');
      else for (const [, name] of unknown) add(`${name}: 확인 불가(unknown)`);
      add('조치 제안');
      if (data.proposals.length === 0) {
        if (event.supportedActions.length === 0) add('연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).');
        else add('AI가 제안한 조치가 없습니다.');
      } else {
        for (const proposal of data.proposals) add(`${proposal.action}: ${proposal.reason}`);
        add('사람 확인이 필요하며 조치는 실행되지 않았습니다.');
      }
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
