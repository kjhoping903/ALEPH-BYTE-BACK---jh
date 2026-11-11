// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

const pcStatusHistory = [];

export function createStudentView({ api, onChange } = {}) {
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
      const searchLabel = document.createElement('label');
      add(searchLabel, 'span', '기록 검색');
      const search = document.createElement('input');
      search.type = 'search';
      search.placeholder = '사건 ID, 앱, 요약 검색';
      search.setAttribute('aria-label', '사건 ID, 앱, 요약 검색');
      searchLabel.append(search);
      filters.append(searchLabel);
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
          && (choices['접속 상태'].value === 'all' || event.state.access === choices['접속 상태'].value)
          && [event.id, event.appId || '', event.summary].some(value => value.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
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
      search.addEventListener('input', renderList);
      renderList();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('div');
      root.className = 'student-dashboard-container';

      const add = (parent, tag, value, className) => {
        const element = document.createElement(tag);
        if (value !== undefined && value !== null) element.textContent = value;
        if (className) element.className = className;
        parent.append(element);
        return element;
      };

      // ---------- 학생 추가 관제 대시보드 (핵심 기능 3가지 우선 배치) ----------
      const dashboardSection = document.createElement('section');
      dashboardSection.className = 'pc-status-dashboard';
      dashboardSection.setAttribute('aria-label', '내 PC 관제 대시보드');
      dashboardSection.style.cssText = 'border: 2px solid #94a3b8; border-radius: 8px; padding: 18px; margin-bottom: 22px; background: #f8fafc; font-family: inherit;';

      // 상단 헤더: 제목 및 ‘다시 조회’ 버튼 (키보드 접근성 강화)
      const dashHeader = document.createElement('div');
      dashHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;';
      
      const titleWrapper = document.createElement('div');
      const headerTitle = add(titleWrapper, 'h3', '내 PC 관제 대시보드 (핵심 기능 3선)', '');
      headerTitle.style.cssText = 'margin: 0 0 4px 0; font-size: 18px; color: #0f172a;';
      const headerSubtitle = add(titleWrapper, 'p', '일반 권한 측정 자원 상태 · 시각별 추이 비교 · 진단 및 다음 할 일 안내', '');
      headerSubtitle.style.cssText = 'margin: 0; font-size: 12px; color: #475569;';
      dashHeader.append(titleWrapper);

      const buttonWrapper = document.createElement('div');
      buttonWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const refreshBtn = document.createElement('button');
      refreshBtn.type = 'button';
      refreshBtn.textContent = '다시 조회';
      refreshBtn.setAttribute('aria-label', '내 PC 자원 상태 다시 조회');
      refreshBtn.tabIndex = 0;
      refreshBtn.style.cssText = 'padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; background: #0284c7; color: #ffffff; border: 1px solid #0369a1; border-radius: 6px; outline: none; transition: background 0.15s;';
      refreshBtn.addEventListener('focus', () => { refreshBtn.style.boxShadow = '0 0 0 3px rgba(2, 132, 199, 0.4)'; });
      refreshBtn.addEventListener('blur', () => { refreshBtn.style.boxShadow = 'none'; });
      buttonWrapper.append(refreshBtn);
      dashHeader.append(buttonWrapper);

      dashboardSection.append(dashHeader);

      // 대기 표시 (로딩 인디케이터)
      const loadingBanner = document.createElement('div');
      loadingBanner.setAttribute('role', 'status');
      loadingBanner.setAttribute('aria-live', 'polite');
      loadingBanner.style.cssText = 'display: none; padding: 10px 14px; margin-bottom: 14px; background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 6px; color: #0369a1; font-size: 13px; font-weight: 500;';
      loadingBanner.textContent = '⏳ PC 자원 상태를 다시 조회하고 있습니다. 잠시만 기다려 주세요...';
      dashboardSection.append(loadingBanner);

      // [핵심 기능 1] 상단: 상태 카드 네 개
      const feature1Heading = add(dashboardSection, 'h4', '1. 내 PC 자원 상태 카드 (실시간 관제)', '');
      feature1Heading.style.cssText = 'font-size: 14px; color: #334155; margin: 0 0 10px 0; font-weight: 600;';
      
      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'pc-cards-grid';
      cardsContainer.setAttribute('role', 'region');
      cardsContainer.setAttribute('aria-label', 'PC 자원 상태 카드 4개');
      cardsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-bottom: 18px;';
      dashboardSection.append(cardsContainer);

      // 하단 2분할 그리드: [핵심 기능 2] 추이 비교 & [핵심 기능 3] 진단 및 다음 할 일
      const lowerSection = document.createElement('div');
      lowerSection.className = 'pc-dashboard-lower';
      lowerSection.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;';
      dashboardSection.append(lowerSection);

      // [핵심 기능 2] 자원 사용 추이 비교 패널
      const trendPanel = document.createElement('div');
      trendPanel.className = 'pc-trend-panel';
      trendPanel.setAttribute('role', 'region');
      trendPanel.setAttribute('aria-label', '자원 사용 추이 비교');
      trendPanel.tabIndex = 0;
      trendPanel.style.cssText = 'background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; outline: none;';
      trendPanel.addEventListener('focus', () => { trendPanel.style.borderColor = '#0284c7'; });
      trendPanel.addEventListener('blur', () => { trendPanel.style.borderColor = '#cbd5e1'; });
      
      const trendHeading = add(trendPanel, 'h4', '2. 자원 사용 추이 비교 (시각별 측정 이력)', '');
      trendHeading.style.cssText = 'font-size: 14px; color: #1e293b; margin: 0 0 8px 0; font-weight: 600;';
      
      const trendContent = document.createElement('div');
      trendPanel.append(trendContent);
      lowerSection.append(trendPanel);

      // [핵심 기능 3] 시스템 상태 진단 및 다음에 할 일 패널
      const diagPanel = document.createElement('div');
      diagPanel.className = 'pc-diag-panel';
      diagPanel.setAttribute('role', 'region');
      diagPanel.setAttribute('aria-label', '시스템 상태 진단 및 대처 안내');
      diagPanel.tabIndex = 0;
      diagPanel.style.cssText = 'background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; outline: none;';
      diagPanel.addEventListener('focus', () => { diagPanel.style.borderColor = '#0284c7'; });
      diagPanel.addEventListener('blur', () => { diagPanel.style.borderColor = '#cbd5e1'; });
      
      const diagHeading = add(diagPanel, 'h4', '3. 시스템 상태 진단 및 다음 할 일', '');
      diagHeading.style.cssText = 'font-size: 14px; color: #1e293b; margin: 0 0 8px 0; font-weight: 600;';
      
      const diagContent = document.createElement('div');
      diagPanel.append(diagContent);
      lowerSection.append(diagPanel);

      root.append(dashboardSection);

      // 카드 생성 헬퍼 (키보드 Tab 탐색 및 명확한 시각적 구별)
      const createStatusCard = (title, valueText, subText, measuredAt, badgeText, badgeType) => {
        const card = document.createElement('article');
        card.tabIndex = 0;
        card.setAttribute('role', 'region');
        card.setAttribute('aria-label', `${title}: ${valueText}`);
        card.style.cssText = 'background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; outline: none; transition: border-color 0.15s;';
        card.addEventListener('focus', () => { card.style.borderColor = '#0284c7'; card.style.boxShadow = '0 0 0 2px rgba(2, 132, 199, 0.2)'; });
        card.addEventListener('blur', () => { card.style.borderColor = '#cbd5e1'; card.style.boxShadow = 'none'; });

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 4px;';
        add(topRow, 'strong', title, '');
        
        const badge = add(topRow, 'span', badgeText, 'data-source-badge');
        badge.style.cssText = badgeType === 'actual'
          ? 'background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap;'
          : (badgeType === 'demo'
            ? 'background: #fef3c7; color: #92400e; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap;'
            : 'background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: bold; padding: 2px 6px; border-radius: 4px; white-space: nowrap;');
        
        card.append(topRow);
        
        const mainVal = add(card, 'div', valueText, '');
        mainVal.style.cssText = 'font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px;';
        
        if (subText) {
          const sub = add(card, 'div', subText, '');
          sub.style.cssText = 'font-size: 12px; color: #64748b; margin-bottom: 6px; line-height: 1.4;';
        }
        
        const timeVal = add(card, 'div', `잰 시각: ${measuredAt || '확인 불가'}`, '');
        timeVal.style.cssText = 'font-size: 11px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 5px;';
        
        return card;
      };

      // 렌더링 갱신 함수 (실패 시 예시 값 위장 방지 및 다음 할 일 안내)
      const updateDashboardView = (data, errorMsg) => {
        cardsContainer.replaceChildren();
        trendContent.replaceChildren();
        diagContent.replaceChildren();

        // [조회 실패 대응] 예시 값을 보여주지 않고 실패한 항목과 다음에 할 일을 명시
        if (errorMsg || !data) {
          for (const itemTitle of ['CPU 사용률', '메모리 사용량', '디스크 남은 공간', '자원 건전도']) {
            cardsContainer.append(createStatusCard(itemTitle, '확인 불가', '조회 실패 상태', '-', '확인 불가', 'unavailable'));
          }

          add(trendContent, 'p', 'PC 자원 조회가 실패하여 추이를 표시할 수 없습니다.', '');

          // 실패 항목 안내
          const failBox = document.createElement('div');
          failBox.style.cssText = 'background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 12px;';
          const failTitle = add(failBox, 'strong', '❌ 실패한 항목', '');
          failTitle.style.cssText = 'color: #991b1b; display: block; margin-bottom: 4px; font-size: 13px;';
          add(failBox, 'p', `사유: ${errorMsg || '로컬 서버 응답 확인 불가'}`, '');
          diagContent.append(failBox);

          // 다음에 할 일 안내
          const actionBox = document.createElement('div');
          actionBox.style.cssText = 'background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px;';
          const actionTitle = add(actionBox, 'strong', '📋 다음에 할 일 (행동 가이드)', '');
          actionTitle.style.cssText = 'color: #166534; display: block; margin-bottom: 6px; font-size: 13px;';
          const actionList = document.createElement('ol');
          actionList.style.cssText = 'margin: 0; padding-left: 20px; font-size: 12px; line-height: 1.6; color: #166534;';
          add(actionList, 'li', '앱 폴더(on-client)에서 서버가 포트 5190으로 실행 중인지 확인하세요.');
          add(actionList, 'li', '관리자 권한을 억지로 승인하려 하지 마시고 일반 사용자 권한을 유지하세요.');
          add(actionList, 'li', '네트워크 연결이 복구되면 상단의 [다시 조회] 버튼을 눌러 다시 시도하세요.');
          actionBox.append(actionList);
          diagContent.append(actionBox);
          return;
        }

        const isDemo = data.mode === 'demo';
        const badgeLabel = isDemo ? '설명용 예시' : '실제 조회';
        const badgeType = isDemo ? 'demo' : 'actual';
        const checkedAtFormatted = data.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : '확인 불가';

        // 1. CPU 카드
        if (data.cpu?.status === 'ok') {
          cardsContainer.append(createStatusCard(
            'CPU 사용률',
            `${data.cpu.percent} ${data.cpu.unit}`,
            `코어 수: ${data.cpu.cores}코어 (${data.cpu.model ? data.cpu.model.slice(0, 22) : '확인 불가'})`,
            new Date(data.cpu.measuredAt || data.checkedAt).toLocaleTimeString(),
            badgeLabel,
            badgeType
          ));
        } else {
          cardsContainer.append(createStatusCard(
            'CPU 사용률',
            '확인 불가',
            `실패 사유: ${data.cpu?.reason || '측정 시간 초과 또는 권한 제한'}`,
            data.cpu?.measuredAt ? new Date(data.cpu.measuredAt).toLocaleTimeString() : '-',
            '확인 불가',
            'unavailable'
          ));
        }

        // 2. 메모리 카드
        if (data.memory?.status === 'ok') {
          cardsContainer.append(createStatusCard(
            '메모리 사용량',
            `${data.memory.usedGb} / ${data.memory.totalGb} ${data.memory.unit}`,
            `사용률: ${data.memory.usedPercent}% (여유: ${data.memory.freeGb} ${data.memory.unit})`,
            new Date(data.memory.measuredAt || data.checkedAt).toLocaleTimeString(),
            badgeLabel,
            badgeType
          ));
        } else {
          cardsContainer.append(createStatusCard(
            '메모리 사용량',
            '확인 불가',
            `실패 사유: ${data.memory?.reason || '메모리 읽기 실패'}`,
            data.memory?.measuredAt ? new Date(data.memory.measuredAt).toLocaleTimeString() : '-',
            '확인 불가',
            'unavailable'
          ));
        }

        // 3. 디스크 남은 공간 카드
        if (data.disk?.status === 'ok') {
          cardsContainer.append(createStatusCard(
            '디스크 남은 공간',
            `${data.disk.freeGb} ${data.disk.unit} 남음`,
            `전체 ${data.disk.totalGb} ${data.disk.unit} 중 여유 ${data.disk.freePercent}% (${data.disk.path || 'C:\\'})`,
            new Date(data.disk.measuredAt || data.checkedAt).toLocaleTimeString(),
            badgeLabel,
            badgeType
          ));
        } else {
          cardsContainer.append(createStatusCard(
            '디스크 남은 공간',
            '확인 불가',
            `실패 사유: ${data.disk?.reason || '디스크 권한 제한 또는 경로 오류'}`,
            data.disk?.measuredAt ? new Date(data.disk.measuredAt).toLocaleTimeString() : '-',
            '확인 불가',
            'unavailable'
          ));
        }

        // 4. 자원 건전도 카드
        const diagStateLabel = data.diagnosis?.status === 'normal' ? '정상 (안정)' : (data.diagnosis?.status === 'warning' ? '주의 필요' : '부분 확인');
        cardsContainer.append(createStatusCard(
          '자원 건전도',
          diagStateLabel,
          data.diagnosis?.summary || '자원 상태 점검 완료',
          checkedAtFormatted,
          badgeLabel,
          badgeType
        ));

        // [핵심 기능 2 렌더링] 추이 비교 내용
        if (pcStatusHistory.length <= 1) {
          add(trendContent, 'p', '현재 측정 이력이 1건입니다. 상단의 [다시 조회] 버튼을 누르면 이전 측정값과 실시간 증감률을 비교합니다.', '');
        } else {
          const current = pcStatusHistory[pcStatusHistory.length - 1];
          const previous = pcStatusHistory[pcStatusHistory.length - 2];
          
          const trendSummary = document.createElement('div');
          trendSummary.style.cssText = 'padding: 8px 12px; background: #f1f5f9; border-radius: 4px; margin-bottom: 10px; font-size: 13px; font-weight: 500;';
          
          const cpuDiff = (current.cpu?.percent !== undefined && previous.cpu?.percent !== undefined)
            ? (current.cpu.percent - previous.cpu.percent).toFixed(1) : null;
          const memDiff = (current.memory?.usedPercent !== undefined && previous.memory?.usedPercent !== undefined)
            ? (current.memory.usedPercent - previous.memory.usedPercent).toFixed(1) : null;
          const diskDiff = (current.disk?.freeGb !== undefined && previous.disk?.freeGb !== undefined)
            ? (current.disk.freeGb - previous.disk.freeGb).toFixed(2) : null;

          const diffParts = [];
          if (cpuDiff !== null) diffParts.push(`CPU: ${cpuDiff > 0 ? '+' : ''}${cpuDiff}%`);
          if (memDiff !== null) diffParts.push(`메모리: ${memDiff > 0 ? '+' : ''}${memDiff}%`);
          if (diskDiff !== null) diffParts.push(`디스크 여유: ${diskDiff > 0 ? '+' : ''}${diskDiff} GB`);

          trendSummary.textContent = `이전 측정 대비 변동 추이: ${diffParts.join(' · ') || '변동 없음'}`;
          trendContent.append(trendSummary);
        }

        // 시각별 이력 테이블 (키보드 Tab 탐색 지원)
        const table = document.createElement('table');
        table.tabIndex = 0;
        table.setAttribute('role', 'table');
        table.setAttribute('aria-label', '최근 시각별 자원 측정 이력');
        table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; outline: none;';
        table.addEventListener('focus', () => { table.style.outline = '1px solid #0284c7'; });
        table.addEventListener('blur', () => { table.style.outline = 'none'; });

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.style.cssText = 'background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;';
        for (const h of ['잰 시각', '구분', 'CPU', '메모리', '디스크 여유']) {
          const th = document.createElement('th');
          th.style.padding = '6px';
          th.textContent = h;
          headerRow.append(th);
        }
        thead.append(headerRow);
        table.append(thead);

        const tbody = document.createElement('tbody');
        for (let i = pcStatusHistory.length - 1; i >= Math.max(0, pcStatusHistory.length - 5); i--) {
          const item = pcStatusHistory[i];
          const tr = document.createElement('tr');
          tr.style.cssText = 'border-bottom: 1px solid #f1f5f9;';
          
          const timeTd = add(tr, 'td', new Date(item.checkedAt).toLocaleTimeString(), '');
          timeTd.style.padding = '6px';
          
          const typeTd = add(tr, 'td', item.mode === 'demo' ? '설명용 예시' : '실제 조회', '');
          typeTd.style.cssText = item.mode === 'demo' ? 'padding: 6px; color: #b45309; font-weight: bold;' : 'padding: 6px; color: #15803d; font-weight: bold;';
          
          const cpuTd = add(tr, 'td', item.cpu?.status === 'ok' ? `${item.cpu.percent} %` : '확인 불가', '');
          cpuTd.style.padding = '6px';
          
          const memTd = add(tr, 'td', item.memory?.status === 'ok' ? `${item.memory.usedPercent} %` : '확인 불가', '');
          memTd.style.padding = '6px';
          
          const diskTd = add(tr, 'td', item.disk?.status === 'ok' ? `${item.disk.freeGb} GB` : '확인 불가', '');
          diskTd.style.padding = '6px';
          
          tbody.append(tr);
        }
        table.append(tbody);
        trendContent.append(table);

        // [핵심 기능 3 렌더링] 상태 진단 설명 및 행동 가이드
        const descList = document.createElement('ul');
        descList.style.cssText = 'margin: 0 0 12px 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #334155;';
        
        const li1 = document.createElement('li');
        li1.textContent = `[진단 요약] ${data.diagnosis?.summary || '자원 상태가 안정적입니다.'}`;
        descList.append(li1);

        const li2 = document.createElement('li');
        li2.textContent = `[권한 원칙] 관리자 권한을 쓰지 않고 일반 사용자 권한으로 안전하게 읽은 결과입니다.`;
        descList.append(li2);

        const li3 = document.createElement('li');
        li3.textContent = `[단위 및 시각] 모든 수치에는 단위(% 및 GB)와 잰 시각이 함께 명시됩니다.`;
        descList.append(li3);

        const li4 = document.createElement('li');
        li4.textContent = `[예외 원칙] 권한 제한이나 측정 오류 항목은 예시로 위장하지 않고 '확인 불가'와 그 사유를 투명하게 표시합니다.`;
        descList.append(li4);

        diagContent.append(descList);

        // 다음에 할 일 가이드
        const guideBox = document.createElement('div');
        guideBox.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-size: 12px; color: #475569;';
        add(guideBox, 'strong', '💡 일상 점검 순서 안내', '');
        const guideList = document.createElement('ol');
        guideList.style.cssText = 'margin: 4px 0 0 0; padding-left: 18px; line-height: 1.5;';
        add(guideList, 'li', '상단 4개 카드의 [실제 조회] 배지와 잰 시각을 확인합니다.');
        add(guideList, 'li', '메모리나 디스크에 [주의 필요] 경고가 뜨면 불필요한 프로그램을 정리합니다.');
        add(guideList, 'li', '자원 변화가 필요할 때 [다시 조회] 버튼(키보드 Tab + Enter)을 누릅니다.');
        guideBox.append(guideList);
        diagContent.append(guideBox);
      };

      // 비동기 PC 자원 상태 불러오기 함수 (대기 표시 제어)
      const fetchPcStatus = async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '조회 중...';
        loadingBanner.style.display = 'block';

        try {
          const res = await fetch('/api/pc-status');
          if (!res.ok) {
            updateDashboardView(null, `서버 응답 오류 (HTTP ${res.status})`);
            return;
          }
          const json = await res.json();
          if (json?.ok && json.data) {
            pcStatusHistory.push(json.data);
            if (pcStatusHistory.length > 10) pcStatusHistory.shift();
            updateDashboardView(json.data);
          } else {
            updateDashboardView(null, json?.error?.message || '자원 데이터 형식 확인 불가');
          }
        } catch (err) {
          updateDashboardView(null, `네트워크 오류 또는 로컬 서버 미응답: ${err?.message || '확인 불가'}`);
        } finally {
          loadingBanner.style.display = 'none';
          refreshBtn.disabled = false;
          refreshBtn.textContent = '다시 조회';
        }
      };

      // 마우스 클릭 및 키보드 Enter/Space 지원
      refreshBtn.addEventListener('click', () => { fetchPcStatus(); });
      refreshBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fetchPcStatus();
        }
      });

      // 기존 측정 이력이 있으면 즉시 렌더링하고, 없으면 초기 1회 로드
      if (pcStatusHistory.length > 0) {
        updateDashboardView(pcStatusHistory[pcStatusHistory.length - 1]);
      } else {
        fetchPcStatus();
      }

      // ---------- 기존 기기/세션 알림 및 진단 정보 (원형 보존) ----------
      const origSection = document.createElement('div');
      origSection.className = 'student-orig-status';
      origSection.style.cssText = 'border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;';

      const modeText = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modeText, mode)) add(origSection, 'p', modeText[mode]);
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
        origSection.append(section);
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
      add(origSection, 'p', '세션 조회는 지금 검증된 연결 한 개를 대상으로 합니다.');

      const alerts = document.createElement('section');
      add(alerts, 'h3', '알림');
      if (notifications.length === 0) add(alerts, 'p', '주의할 알림이 없습니다');
      else {
        const list = document.createElement('ul');
        for (const item of notifications) add(list, 'li', `${item.resource} · ${item.code}: ${item.message}`);
        alerts.append(list);
      }
      origSection.append(alerts);

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
      button.tabIndex = 0;
      const result = add(help, 'p', '');
      button.addEventListener('click', async () => {
        if (!copyText) return;
        try {
          await navigator.clipboard.writeText(copyText);
          result.textContent = '도움정보를 클립보드에 복사했습니다.';
        } catch {
          result.textContent = '클립보드에 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.';
        }
      });
      help.append(button);
      help.append(result);
      origSection.append(help);

      root.append(origSection);
      return root;
    },
    renderVulnerabilities({ status, mode, data, error }) {
      const root = document.createElement('div');
      const add = (parent, tag, value) => {
        const element = document.createElement(tag);
        element.textContent = String(value);
        parent.append(element);
        return element;
      };
      const modes = { demo: '예제 자료', disconnected: '연결 없음', unknown: '연결 상태 확인 불가' };
      if (Object.hasOwn(modes, mode)) add(root, 'p', modes[mode]);

      if (status === 'idle') {
        add(root, 'p', '설치 패키지 조회 전입니다.');
        return root;
      }
      if (status === 'loading') {
        add(root, 'p', '설치 패키지 조회 중입니다. 이전 표는 현재 결과가 아닙니다.');
        return root;
      }
      if (status === 'error') {
        add(root, 'p', `설치 패키지 조회 실패: ${error?.message || '결과를 확인할 수 없습니다.'}`);
        add(root, 'p', '조회 실패는 취약점 없음이 아닙니다. 이전 표는 현재 결과가 아닙니다.');
        return root;
      }
      if (status !== 'ok' || !data) {
        add(root, 'p', '설치 패키지 조회 상태를 확인할 수 없습니다.');
        return root;
      }

      const scanStatuses = {
        complete: '모두 조회',
        partial: '일부 조회 실패',
        not_checked: '아직 조회 안 함 · 승인된 공개 조회 대상 없음',
        not_configured: '조회 대상 프로젝트 설정 필요',
        unverifiable: 'lock 파일 확인 불가',
      };
      add(root, 'p', `전체 조회 상태: ${scanStatuses[data.status] || '확인 불가'} (${data.status || 'unknown'})`);
      if (data.status === 'not_checked' || data.status === 'not_configured' || data.status === 'unverifiable') {
        add(root, 'p', '미조회 또는 확인 불가 상태이며 취약점 없음으로 판단할 수 없습니다. 대상 경로와 허용 패키지는 운영자가 준비합니다.');
      }
      if (data.status === 'partial') add(root, 'p', '일부 조회 실패가 있어 전체 결과를 확인할 수 없습니다. 확인된 취약점 항목은 아래에 유지합니다.');
      if (data.lockfileVersion != null) add(root, 'p', `package-lock.json 버전: ${data.lockfileVersion}`);
      if (data.lockfileHash != null) add(root, 'p', `package-lock.json 해시: ${data.lockfileHash}`);
      if (data.checkedAt != null) add(root, 'p', `전체 조회 시각: ${data.checkedAt}`);

      const packages = Array.isArray(data.packages) ? data.packages : [];
      if (packages.length === 0) {
        if (data.status === 'complete') add(root, 'p', '표시할 패키지 조회 결과가 없습니다.');
        return root;
      }
      add(root, 'p', '표시 버전은 package-lock.json에 기록된 정확한 값입니다. 설치된 node_modules 메타데이터와 대조하며, 확인할 수 없는 패키지는 별도로 표시합니다.');
      const table = document.createElement('table');
      const head = document.createElement('tr');
      for (const label of ['패키지', '정확한 설치 버전', '조회 상태', '출처', '조회 시각', '취약점 ID · 수정 시각']) add(head, 'th', label);
      const thead = document.createElement('thead');
      thead.append(head);
      table.append(thead);
      const body = document.createElement('tbody');
      for (const pkg of packages) {
        const row = document.createElement('tr');
        row.setAttribute('data-student-package-name', pkg.name);
        row.setAttribute('data-student-package-version', pkg.version);
        add(row, 'td', pkg.name);
        add(row, 'td', pkg.version);
        const findings = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
        const packageStatuses = {
          known_vulnerabilities: '알려진 항목 있음',
          none_found: '조회 범위에서 알려진 항목 없음 · 안전 판정 아님',
          unverifiable: findings.length ? '일부 확인 · 전체 조회 확인 불가' : '조회 확인 불가',
        };
        add(row, 'td', `${packageStatuses[pkg.status] || '확인 불가'} (${pkg.status || 'unknown'})`);
        add(row, 'td', pkg.source ?? '정보 없음');
        add(row, 'td', pkg.checkedAt ?? '정보 없음');
        const findingCell = document.createElement('td');
        for (const finding of findings) add(findingCell, 'p', `${finding.id} · 수정 시각: ${finding.modified}`);
        row.append(findingCell);
        body.append(row);
      }
      table.append(body);
      root.append(table);
      return root;
    },
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
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error }) {
      const root = document.createElement('div');
      const add = (value) => {
        const line = document.createElement('p');
        line.textContent = value;
        root.append(line);
      };
      const resultUnknown = () => {
        add('결과 불명(unknown): 성공이나 효과 없음으로 판단하지 마세요.');
        add('연동 시스템 결과만 재조회하세요.');
      };
      const intentMatches = Boolean(event?.id) && Boolean(actionId) && Boolean(receipt?.requestId)
        && (!receipt?.eventId || receipt.eventId === event.id)
        && (!receipt?.actionId || receipt.actionId === actionId);
      const effectConfirmed = status === 'succeeded' && intentMatches && observation?.effectApplied === true
        && Boolean(observation.observedAt) && Boolean(receipt?.receiptId);

      if (status === 'idle') add('아직 미실행(idle)');
      else if (status === 'loading') {
        add(`조치 준비 또는 결과 조회 중(loading): ${message || '결과가 아직 확인되지 않았습니다.'}`);
      } else if (status === 'prepared') {
        add('준비됨·미실행(prepared)');
        add('대상과 조치를 사람이 확인하기 전이며 아직 서버에 집행을 요청하지 않았습니다.');
        if (confirmationExpiresAt) add(`확인 기한: ${confirmationExpiresAt}`);
      } else if (status === 'executing') {
        add('서버에 전달 중(executing)');
        add('전송 중이며 결과는 아직 확인되지 않았습니다.');
      } else if (status === 'pending') {
        add('서버 접수·처리 중(pending)');
        add('접수 응답(ACK)은 실제 효과나 실행 성공을 뜻하지 않습니다.');
      } else if (status === 'succeeded') {
        if (effectConfirmed) {
          add('효과 확인(succeeded)');
          add(`관측 시각: ${observation.observedAt}`);
          add('effectApplied: true');
          add(`receiptId: ${receipt.receiptId}`);
          if (event?.id) root.setAttribute('data-student-action-event', event.id);
          if (receipt?.requestId) root.setAttribute('data-student-action-request', receipt.requestId);
        } else resultUnknown();
      } else if (status === 'denied') {
        add(`연동 시스템 거절(denied): ${message || '거절 사유를 확인할 수 없습니다.'}`);
      } else if (status === 'failed') {
        add(`연동 시스템 실패(failed): ${message || '실패 사유를 확인할 수 없습니다.'}`);
      } else if (status === 'unknown') resultUnknown();
      else if (status === 'expired') {
        add('확인 기한 지남(expired)');
        add('이전 준비 상태로 집행하지 말고 조치를 다시 준비하세요.');
      } else if (status === 'error') {
        add(`요청 처리 안 됨(error): ${error?.code || 'ACTION_ERROR'} · ${error?.message || '확인 불가'}`);
      } else add('조치 상태 확인 불가(unknown)');

      if (event?.id) {
        add(`사건 ID: ${event.id}`);
        const evidenceIds = Array.isArray(event.evidence) ? event.evidence.map(item => item.id) : [];
        if (evidenceIds.length > 0) add(`근거 ID: ${evidenceIds.join(', ')}`);
      }
      if (actionId) add(`조치 ID: ${actionId}`);
      if (target?.id) add(`실제 대상 ID: ${target.id}`);
      if (target?.generation != null) add(`대상 generation: ${target.generation}`);
      if (receipt?.requestId) add(`requestId: ${receipt.requestId}`);
      if (receipt?.receiptId && !effectConfirmed) add(`receiptId: ${receipt.receiptId}`);
      if (receipt?.version != null) add(`version: ${receipt.version}`);
      if (typeof receipt?.replayed === 'boolean') add(`replayed: ${receipt.replayed}`);
      if (status !== 'idle') add('조작은 제공 화면의 버튼으로 진행하세요. 학생 화면은 요청을 전송하지 않습니다.');
      return root;
    },
  };
}
