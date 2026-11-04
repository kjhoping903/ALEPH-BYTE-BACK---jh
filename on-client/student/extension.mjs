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
      else if (mode내 보안 Agent의 이름은 ‘케셰브’이고 지금은 16단계 ‘알림·빈 상태·오류·진단 정보 정리’를 진행해.
아래 공식 과제 안내를 먼저 읽고 현재 파일·함수·입력 계약과 대조해 줘. 안내에 없는 기능이나 제출 조건은 추가하지 마.
목표: 데이터가 없는 경우와 조회 실패를 구분하고 사용자가 다시 시도할 방법을 안내합니다.
수정 대상: student/extension.mjs → renderStatus, renderEvents의 상세 영역

진행 방식:
1. 현재 구현을 읽고 유지할 기능, 수정할 함수, 입력 데이터, 확인할 상태를 먼저 설명해 줘. 파일이 없거나 계약이 다르면 추측해서 새 구조를 만들지 말고 차이를 알려 줘.
2. 아래 구현 순서에 따라 작은 단위로 수정해 줘. 각 수정 뒤 변경한 파일·함수와 이유를 짧게 설명하고, 내가 확인할 화면과 예상 결과를 알려 줘.
   1) devices·sessions·diagnostics 각각의 loading / ok / error와 빈 목록을 분리해 표시합니다.
   2) notifications의 resource·code·message를 항목별로 표시합니다. 알림이 없으면 알림 없음으로 표시합니다.
   3) 진단 정보는 제공 화면이 전달합니다. 학생 코드에서 /api/diagnostics를 직접 호출하지 않습니다. 진단 결과에서 requestId·component·version·checkedAt·engine.mode·engine.code만 표시합니다. 학생 상태 영역에 정확한 이름 ‘도움정보 복사’인 버튼을 만들고 사용자가 누를 때만 복사합니다.
   4) 미지원 조치가 입력된 경우에만 기록 상세 영역(data-student-event-detail)에 ‘<action> 미지원’ 비활성 버튼을 표시합니다. 조치 요청을 전송하지 않습니다.
3. 상태 문구는 IT업계에서 쓰는 정확한 한국어로 작성해 줘. API 상태값·함수명·data-* 속성·필수 버튼 이름은 공식 계약대로 유지해. 의미를 바꾸는 의역이나 막연한 성공 안내는 쓰지 마.
4. 학생 화면을 구현하는 단계에서는 DOM을 createElement와 textContent로 작성하고, 색상뿐 아니라 텍스트로 상태를 구분해. 키보드로 조작할 수 있는 label과 버튼을 사용해. 문서 작성 단계에서는 불필요한 UI 변경을 하지 마.
5. 내가 직접 확인할 순서를 한 번에 하나씩 안내해 줘. 코드만 읽은 것, 모의 데이터로 점검한 것, 실제 화면에서 확인한 것을 구분하고 실행하지 않은 검사는 미확인으로 남겨.
   확인 1: 복사한 진단 정보에 비밀번호·토큰·API 키가 없는지 확인합니다.
   확인 2: ‘다시 불러오기’를 직접 눌러 성공하면 이전 오류가 사라지는지 확인합니다. 자동 재요청을 추가하지 않습니다.
현재 지원 범위: 세션 조회는 현재 검증된 연결 한 개를 대상으로 하며 과거 세션 전체 목록이 아닙니다.

기존 학생 코드·앞 단계 기능·Git 기록을 지우거나 덮어쓰지 마. 제공 서버·public/app.js·판정 코드·인증 설정을 수정하지 마. 토큰·비밀번호·API 키를 요청하거나 출력하지 마.
수업용 AI가 명령을 실행할 수 없다면 실행했다고 말하지 말고 내가 PowerShell에서 실행할 명령과 작업 폴더를 알려 줘. 실제 유료 AI 요청·보안 조치·단계 제출은 임의로 실행하지 마.
끝나면 변경 파일, 직접 확인한 결과, 미확인 항목, 다음 작업을 정리해 줘. 커밋 해시나 통과 결과를 만들어 내지 마.

아래는 현재 단계 화면의 공식 과제 안내야. 위 보충 설명과 충돌하면 구현 전에 차이를 알려 줘.
목표: 실패·빈 화면·다시 시도·도움정보·미지원 조치를 사용자가 이해할 수 있게 안내합니다.

고칠 파일: renderStatus 와, 미지원 조치 안내를 넣을 15단계 renderEvents 상세. 이 단계부터 필요하면 학생 화면·설명 파일을 더해도 됩니다. 그 밖의 앞 단계 함수는 그대로 둡니다.

받는 값: renderStatus({ devices, sessions, notifications, diagnostics, mode }) - devices·sessions·diagnostics: { status, mode, data?, error? } - notifications: [{ resource, code, message }]. 제공 코드가 실패한 자료, 점검이 필요한 기기, 끝난 세션, XDR 경보와 확인 불가 상태가 있는 기록을 모아 줍니다. - diagnostics: GET /api/diagnostics 의 비밀 없는 점검 결과 diagnostics는 제공 화면이 조회한 결과를 전달하는 입력 데이터입니다. 학생 코드에서 /api/diagnostics를 직접 호출하지 않습니다.

어디까지 보이는가(관측 범위): - 등록 기기는 내 이름으로 등록되고 회수되지 않은 기기 100개까지입니다. 지금 쓰는 기기가 맨 앞에 옵니다. 운영체제처럼 서버가 모르는 값은 확인 불가로 옵니다. - 세션은 지금 검증된 연결 하나만 옵니다. 지난 세션 목록이 아닙니다. - 전체 건수·생략 여부·확인 시각은 제공 화면이 보여 줍니다. 형식이 맞지 않으면 제공 화면이 목록 전체를 확인 불가로 바꿉니다.

상태별 표시: | 상황 | 보여 줄 것 | |---|---| | 기기·세션 불러오는 중 | 불러오는 중 | | 빈 목록 | 등록된 기기가 없음 / 현재 연결 없음 | | 실패 | 무엇을 불러오지 못했는지와 message, 사용자가 누르는 다시 시도 안내 | | 알림 있음 | 알림마다 어느 자료(resource)인지와 message | | 미지원 조치 | 요청을 보내지 않는 "아직 지원하지 않음" 안내 |

AI 에게 붙여 넣을 프롬프트: student/extension.mjs 의 renderStatus 를 구현해 줘. 앞 단계 함수는 그대로 둬. 입력은 { devices, sessions, notifications, diagnostics, mode } 야. - devices·sessions 는 { status, mode, data?, error? }. 불러오는 중·빈 목록·실패를 서로 다른 문장으로 보여 줘. - 기기는 label 과 status 를, 세션은 id 와 status 를 원래 값과 함께 보여 줘. - 실패하면 무엇을 불러오지 못했는지와, 다시 시도는 사용자가 위쪽 다시 불러오기 버튼을 직접 누르는 것이라고 안내해(예: "다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요"). 시간이 초과된 경우는 시간 초과라는 것이 드러나게 하고, 다시 불러와 성공하면 이전 실패 안내를 지워. 자동으로 다시 요청하지 마. - notifications 배열은 항목마다 어느 자료의 알림인지(resource), 안전한 code, message 를 글자로 보여 줘. 비어 있으면 주의할 알림이 없다는 것(예: "주의할 알림이 없습니다"). - diagnostics 가 ok 면 requestId, component, version, checkedAt, engine.mode, engine.code 를 보여 줘. API 키나 인증 토큰 같은 값은 화면에 쓰지 마. - 학생 상태 칸 안에 이름이 정확히 "도움정보 복사" 인 버튼을 만들고, 이 정보가 도움 요청에 쓰도록 복사하는 것이라고 알려 줘. 사용자가 누를 때만 위의 안전한 값을 복사해. - 15·16단계 자동 확인이 연결되지 않은 조치를 넘겨 주면, 15단계 상세(data-student-event-detail) 안에 이름이 정확히 "<action> 미지원" 인 비활성 버튼을 만들고, 아직 지원하지 않는 조치라는 것을 알려 줘(예: "조치 실행 연결은 준비 중입니다"). 실행에 성공한 것처럼 읽히는 문장은 쓰지 말고 어떤 요청도 보내지 마. 실제 목록의 supportedActions 가 비어 있으면 버튼을 만들지 마. 필요하면 15단계 상세 함수에 이 안내를 더해도 돼. - 세션은 지금 연결 하나만 온다는 점을 적어. 지난 세션 목록이라고 쓰지 마. - textContent 만 써. renderStatus 하나만 고쳐서는 이 단계를 통과할 수 없습니다. 미지원 조치 안내는 15단계 상세 안에 있어야 하고, 도움정보 복사 버튼은 학생 상태 칸 안에 있어야 합니다. 제공 화면의 복사 버튼이나 안내 문장으로 대신할 수 없습니다. 학생에게 조치 요청(POST) 권한이나 실제 조치 버튼을 더하라는 뜻은 아닙니다.

스스로 확인: 1. 기기·세션이 빈 경우와 실패한 경우가 다르게 보이는지 봅니다. 2. 다시 시도가 버튼을 누를 때만 일어나는지 봅니다(브라우저 개발자 도구 네트워크 탭에서 요청이 저절로 반복되지 않는지). 3. 도움정보를 복사해 열쇠·비밀이 없는지 읽어 봅니다. 4. 미지원 조치 버튼을 눌러도 요청이 나가지 않는지 봅니다.

필수 확인 항목: student-source-changed, devices-sessions-refresh, notifications, loading_empty, retry, diagnostics_redaction, unsupported_action. AI가 제출한 커밋의 코드를 위 항목과 대조해 판정합니다. 실제 화면에서의 동작은 아래 안내에 따라 직접 확인합니다.

다음 단계 조건: AI가 이 단계의 필수 확인 항목을 모두 통과로 판정하면 서버에 통과와 진도를 기록합니다. === 'disconnected') add('', '연결 없음');
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
