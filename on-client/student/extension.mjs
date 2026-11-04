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
    renderEvents({ status, mode, data, error }) {
      const root = document.createElement('div');
      const add = (parent, tag, value) => {
        const element = document.createElement(tag);
        element.textContent = value;
        parent.append(element);
        return element;
      };
      const modes = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modes, mode)) add(root, 'p', modes[mode]);
      if (status === 'loading') {
        add(root, 'p', '불러오는 중');
        return root;
      }
      if (status === 'error') {
        if (error?.code === 'CONTRACT_MISMATCH') add(root, 'p', '기록 확인 불가');
        add(root, 'p', `기록을 불러오지 못했습니다: ${error?.message || '확인 불가'}`);
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        add(root, 'p', '기록 확인 불가');
        return root;
      }

      const events = [...data].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      if (events.length === 0) {
        add(root, 'p', '표시할 기록이 없습니다');
        return root;
      }
      const filters = document.createElement('div');
      const choices = {};
      const makeFilter = (name, values, labelFor) => {
        const label = document.createElement('label');
        add(label, 'span', name);
        const select = document.createElement('select');
        for (const value of ['all', ...new Set(values)]) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value === 'all' ? '전체' : labelFor(value);
          select.append(option);
        }
        label.append(select);
        filters.append(label);
        choices[name] = select;
      };
      makeFilter('기록 종류', events.map(event => event.kind), value => ({ access: '접속', xdr: 'XDR 경보' })[value] || value);
      makeFilter('업무 앱', events.map(event => event.appId || ''), value => value || '앱 확인 불가');
      makeFilter('접속 상태', events.map(event => event.state.access), value => value);
      root.append(filters);
      const count = add(root, 'p', '');
      const list = document.createElement('ul');
      root.append(list);

      const states = {
        access: { allowed: '허용', denied: '거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const stateText = (type, value) => `${states[type][value] || '확인 불가'}(${value})`;
      const renderList = () => {
        list.replaceChildren();
        const visible = events.filter(event =>
          (choices['기록 종류'].value === 'all' || event.kind === choices['기록 종류'].value)
          && (choices['업무 앱'].value === 'all' || (event.appId || '') === choices['업무 앱'].value)
          && (choices['접속 상태'].value === 'all' || event.state.access === choices['접속 상태'].value));
        count.textContent = `표시된 기록 ${visible.length}건`;
        if (visible.length === 0) {
          add(list, 'li', '표시할 기록이 없습니다');
          return;
        }
        for (const event of visible) {
          const row = document.createElement('li');
          row.setAttribute('data-student-event-id', event.id);
          add(row, 'p', `사건 ID: ${event.id} · 시각: ${event.at} · 종류: ${{ access: '접속', xdr: 'XDR 경보' }[event.kind] || event.kind} · 앱: ${event.appId || '앱 확인 불가'} · 요약: ${event.summary}`);
          const button = add(row, 'button', `${event.id} 상세`);
          button.type = 'button';
          button.addEventListener('click', () => {
            const existing = row.querySelector('[data-student-event-detail]');
            if (existing) existing.remove();
            else {
              const detail = document.createElement('div');
              detail.setAttribute('data-student-event-detail', event.id);
              add(detail, 'p', `사건 ID: ${event.id}`);
              add(detail, 'p', `앱 ID: ${event.appId || '앱 확인 불가'}`);
              add(detail, 'h4', '근거');
              for (const item of event.evidence) add(detail, 'p', `${item.id}: ${item.text}`);
              add(detail, 'h4', '규칙');
              for (const item of event.rules) add(detail, 'p', `${item.id}: ${item.text}`);
              add(detail, 'p', `접속 상태: ${stateText('access', event.state.access)}`);
              add(detail, 'p', `세션 상태: ${stateText('session', event.state.session)}`);
              add(detail, 'p', `기기 상태: ${stateText('device', event.state.device)}`);
              if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
                add(detail, 'p', '조치 실행 연결은 준비 중입니다.');
                for (const action of event.supportedActions) {
                  const unsupported = add(detail, 'button', `${action} 미지원`);
                  unsupported.type = 'button';
                  unsupported.disabled = true;
                }
              }
              row.append(detail);
            }
          });
          list.append(row);
        }
      };
      for (const select of Object.values(choices)) select.addEventListener('change', renderList);
      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('div');
      const add = (parent, tag, value) => {
        const element = document.createElement(tag);
        element.textContent = value;
        parent.append(element);
        return element;
      };
      const modeText = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modeText, mode)) add(root, 'p', modeText[mode]);
      const retry = '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요.';
      const showResource = (title, resource, emptyText, showItems) => {
        const section = document.createElement('section');
        add(section, 'h3', title);
        if (resource?.status === 'loading') add(section, 'p', `${title} 불러오는 중`);
        else if (resource?.status === 'error') {
          const timeout = /TIMEOUT/i.test(resource.error?.code || '') ? '시간 초과: ' : '';
          add(section, 'p', `${title} 정보를 불러오지 못했습니다: ${timeout}${resource.error?.message || '확인 불가'}`);
          add(section, 'p', retry);
        } else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) add(section, 'p', emptyText);
          else showItems(section, resource.data);
        } else add(section, 'p', `${title} 확인 불가`);
        root.append(section);
      };
      const deviceText = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const sessionText = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      showResource('기기', devices, '등록된 기기가 없습니다', (section, items) => {
        const list = document.createElement('ul');
        for (const item of items) add(list, 'li', `${item.label} · ${deviceText[item.status] || '확인 불가'}(${item.status})`);
        section.append(list);
      });
      showResource('세션', sessions, '현재 연결이 없습니다', (section, items) => {
        const list = document.createElement('ul');
        for (const item of items) add(list, 'li', `${item.id} · ${sessionText[item.status] || '확인 불가'}(${item.status})`);
        section.append(list);
      });
      add(root, 'p', '세션 조회는 지금 검증된 연결 한 개를 대상으로 합니다.');

      const alerts = document.createElement('section');
      add(alerts, 'h3', '알림');
      if (notifications.length === 0) add(alerts, 'p', '주의할 알림이 없습니다');
      else {
        const list = document.createElement('ul');
        for (const item of notifications) add(list, 'li', `${item.resource} · ${item.code}: ${item.message}`);
        alerts.append(list);
      }
      root.append(alerts);

      const help = document.createElement('section');
      add(help, 'h3', '진단 정보');
      let copyText = '';
      if (diagnostics?.status === 'loading') add(help, 'p', '진단 정보 불러오는 중');
      else if (diagnostics?.status === 'error') {
        const timeout = /TIMEOUT/i.test(diagnostics.error?.code || '') ? '시간 초과: ' : '';
        add(help, 'p', `진단 정보를 불러오지 못했습니다: ${timeout}${diagnostics.error?.message || '확인 불가'}`);
        add(help, 'p', retry);
      } else if (diagnostics?.status === 'ok' && diagnostics.data) {
        const data = diagnostics.data;
        const safe = {
          requestId: data.requestId,
          component: data.component,
          version: data.version,
          checkedAt: data.checkedAt,
          engine: { mode: data.engine?.mode, code: data.engine?.code },
        };
        const lines = [
          ['requestId', safe.requestId], ['component', safe.component],
          ['version', safe.version], ['checkedAt', safe.checkedAt],
          ['engine.mode', safe.engine.mode], ['engine.code', safe.engine.code],
        ];
        for (const [name, value] of lines) add(help, 'p', `${name}: ${value ?? '확인 불가'}`);
        copyText = lines.map(([name, value]) => `${name}: ${value ?? '확인 불가'}`).join('\n');
      } else add(help, 'p', '진단 정보 확인 전입니다');
      add(help, 'p', '도움 요청에 사용할 정보를 확인한 뒤 복사하세요.');
      const button = add(help, 'button', '도움정보 복사');
      button.type = 'button';
      button.disabled = !copyText;
      const result = add(help, 'p', '');
      button.addEventListener('click', async () => {
        if (!copyText) return;
        try {
          await navigator.clipboard.writeText(copyText);
          result.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          result.textContent = '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.';
        }
      });
      root.append(help);
      return root;
    },
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
      if (explanation?.status === 'ok' && event?.id) {
        root.setAttribute('data-student-explanation-event', event.id);
        add(`사건 ID: ${event.id}`);
        add(`AI 사건 설명: ${explanation.data?.summary || '요약 확인 불가'}`);
      } else if (explanation?.status === 'error') {
        add(`AI 사건 설명 실패: ${explanation.error?.code || 'AI_REQUEST_UNVERIFIED'} · ${explanation.error?.message || '확인 불가'}`);
        add('보안 기록은 그대로 유지됩니다.');
      } else if (explanation?.status === 'loading') add('AI 사건 설명 요청 중입니다.');
      else add('AI 사건 설명은 아직 실행하지 않았습니다.');
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
