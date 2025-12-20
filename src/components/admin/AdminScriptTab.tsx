import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, Button, TextArea, Form, Input, Toast, Dialog, Collapse, List, Space, Popup } from 'antd-mobile';
import StockChart from '../StockChart';
import apiClient from '../../services/apiClient';

// 事件型別
interface EventItem {
  id?: number;
  day: number;
  title: string;
  news?: string | null;
  trend: string;
}

// 劇本單日型別
interface ScriptDayItem {
  day: number;
  price: number;
  title?: string | null;
  news?: string | null;
  effectiveTrend: string;
}

// 模擬結果型別
interface SimulationRow {
  name: string;
  stats: {
    min: number;
    max: number;
    avg: number;
    q1: number;
    q2: number;
    q3: number;
  };
}

const emptyEvent: EventItem = {
  day: 1,
  title: '',
  news: '',
  trend: 'PAN_ZHENG',
};

const trendOptions = [
  { value: 'CHAO_LI_DUO', label: '超利多' },
  { value: 'LI_DUO', label: '利多' },
  { value: 'PAN_ZHENG', label: '盤整' },
  { value: 'LI_KONG', label: '利空' },
  { value: 'CHAO_LI_KONG', label: '超利空' },
  { value: 'BU_YING_XIANG', label: '不影響' },
];

const trendCNToEnum: Record<string, string> = {
  '超利多': 'CHAO_LI_DUO',
  '利多': 'LI_DUO',
  '盤整': 'PAN_ZHENG',
  '利空': 'LI_KONG',
  '超利空': 'CHAO_LI_KONG',
  '不影響': 'BU_YING_XIANG',
};

const trendEnumToCN: Record<string, string> = {
  CHAO_LI_DUO: '超利多',
  LI_DUO: '利多',
  PAN_ZHENG: '盤整',
  LI_KONG: '利空',
  CHAO_LI_KONG: '超利空',
  BU_YING_XIANG: '不影響',
};

const simNameToCN: Record<string, string> = {
  Perfect: '完美玩家',
  Smart: '聰明玩家',
  Random: '隨機玩家',
  Unlucky: '倒楣玩家',
};

const normalizeTrend = (val: string) => {
  if (!val) return null;
  if (trendCNToEnum[val]) return trendCNToEnum[val];
  if (Object.values(trendCNToEnum).includes(val)) return val; // already enum
  return null;
};

const AdminScriptTab: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsJson, setEventsJson] = useState('[]');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<ScriptDayItem[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'json'>('table');
  const [editingEvent, setEditingEvent] = useState<EventItem>(emptyEvent);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [simResult, setSimResult] = useState<SimulationRow[]>([]);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [editDayData, setEditDayData] = useState<ScriptDayItem | null>(null);
  const [jsonHelpOpen, setJsonHelpOpen] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPromptOutput, setAiPromptOutput] = useState('');

  // 產生劇本按鈕直接呼叫，避免表單未提交的狀況
  const handleGenerateClick = () => {
    const values = generateForm.getFieldsValue();
    handleGenerate(values);
  };

  const [eventForm] = Form.useForm<EventItem>();
  const [generateForm] = Form.useForm();
  const [editDayForm] = Form.useForm<{ price: number; title?: string; news?: string }>();

  const loadEvents = async () => {
    const res = await apiClient.get('/admin/events');
    setEvents(res.data);
    setEventsJson(JSON.stringify(res.data, null, 2));
  };

  const loadScript = async () => {
    const res = await apiClient.get('/admin/script/preview');
    setScript(res.data);
  };

  useEffect(() => {
    loadEvents();
    loadScript();
  }, []);

  useEffect(() => {
    eventForm.setFieldsValue(editingEvent);
  }, [editingEvent, eventForm]);

  const handleSaveEvent = async (values: EventItem) => {
    try {
      setLoading(true);
      if (values.id) {
        await apiClient.put(`/admin/events/${values.id}`, values);
      } else {
        await apiClient.post('/admin/events', values);
      }
      Toast.show({ icon: 'success', content: '事件已儲存' });
      setEditingEvent(emptyEvent);
      setEventModalOpen(false);
      await loadEvents();
    } catch (error: any) {
      Toast.show({ icon: 'fail', content: error?.response?.data?.error || '儲存失敗' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id?: number) => {
    if (!id) return;
    const confirmed = await Dialog.confirm({ content: '確定刪除這筆事件？', closeOnMaskClick: false });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/events/${id}`);
      Toast.show({ icon: 'success', content: '已刪除' });
      await loadEvents();
    } catch (error: any) {
      Toast.show({ icon: 'fail', content: error?.response?.data?.error || '刪除失敗' });
    }
  };

  const handleSaveJson = async () => {
    try {
      setLoading(true);
      const parsed = JSON.parse(eventsJson);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON 需為陣列');
      }

      const payload = parsed.map((ev, idx) => {
        const trend = normalizeTrend(ev.trend);
        if (!trend) {
          throw new Error(`第 ${idx + 1} 筆 trend 不合法: ${ev.trend}`);
        }
        return {
          ...ev,
          trend,
          day: Number(ev.day),
        };
      });

      await apiClient.post('/admin/events/batch', payload);
      Toast.show({ icon: 'success', content: 'JSON 已儲存' });
      await loadEvents();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || '匯入失敗，請確認 JSON 格式';
      Toast.show({ icon: 'fail', content: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (values: any) => {
    try {
      setLoading(true);
      await apiClient.post('/admin/script/generate', {
        targetDailyChange: Number(values.targetDailyChange ?? 0.05),
        bullMarketDrift: Number(values.bullMarketDrift ?? 0.1),
        decayRate: Number(values.decayRate ?? 0.9),
      });
      Toast.show({ icon: 'success', content: '劇本已生成' });
      await loadScript();
    } catch (error: any) {
      Toast.show({ icon: 'fail', content: error?.response?.data?.error || '生成失敗' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDay = (dayItem: ScriptDayItem) => {
    setEditDayData(dayItem);
    setEditPopupOpen(true);
    editDayForm.setFieldsValue({
      price: dayItem.price,
      title: dayItem.title || '',
      news: dayItem.news || '',
    });
  };

  const handleUpdateDay = async () => {
    if (!editDayData) return;
    try {
      setLoading(true);
      const values = editDayForm.getFieldsValue();
      await apiClient.put(`/admin/script/day/${editDayData.day}`, {
        price: Number(values.price),
        title: values.title,
        news: values.news,
      });
      Toast.show({ icon: 'success', content: `第 ${editDayData.day} 天已更新` });
      setEditPopupOpen(false);
      await loadScript();
    } catch (error: any) {
      Toast.show({ icon: 'fail', content: error?.response?.data?.error || '更新失敗' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    try {
      setLoading(true);
      const res = await apiClient.post('/admin/validate/run');
      setSimResult(res.data);
      Toast.show({ icon: 'success', content: '模擬完成' });
    } catch (error: any) {
      Toast.show({ icon: 'fail', content: error?.response?.data?.error || '模擬失敗' });
    } finally {
      setLoading(false);
    }
  };

  const priceHistory = useMemo(
    () =>
      script.map((d) => ({
        day: d.day,
        price: d.price,
        title: d.title || null,
        news: d.news || null,
        effectiveTrend: d.effectiveTrend,
      })),
    [script]
  );

  return (
    <div style={{ padding: 12 }}>
      <Tabs>
        <Tabs.Tab title='關鍵事件' key='events'>
          <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'table' | 'json')}>
            <Tabs.Tab title='Table' key='table'>
              <Space style={{ marginBottom: 12 }}>
                <Button
                  color='primary'
                  onClick={() => {
                    setEditingEvent(emptyEvent);
                    eventForm.setFieldsValue(emptyEvent);
                    setEventModalOpen(true);
                  }}
                >
                  新增事件
                </Button>
              </Space>

              <List header='事件列表'>
                {events.map((ev) => (
                  <List.Item
                    key={ev.id}
                    description={`Day ${ev.day} | 趨勢: ${trendEnumToCN[ev.trend] || ev.trend}`}
                    extra={
                      <Space>
                        <Button
                          size='mini'
                          color='primary'
                          onClick={() => {
                            setEditingEvent(ev);
                            eventForm.setFieldsValue(ev);
                            setEventModalOpen(true);
                          }}
                        >
                          編輯
                        </Button>
                        <Button size='mini' color='danger' onClick={() => handleDeleteEvent(ev.id)}>
                          刪除
                        </Button>
                      </Space>
                    }
                  >
                    {ev.title}
                  </List.Item>
                ))}
              </List>
            </Tabs.Tab>

            <Tabs.Tab title='JSON' key='json'>
              <Space wrap style={{ marginBottom: 8 }}>
                <Button size='mini' onClick={() => setJsonHelpOpen(true)}>
                  提示
                </Button>
                <Button size='mini' color='primary' onClick={() => setAiPromptOpen(true)}>
                  產生 AI 術語
                </Button>
              </Space>
              <TextArea
                value={eventsJson}
                onChange={setEventsJson}
                autoSize={{ minRows: 10, maxRows: 18 }}
                placeholder='貼上事件 JSON 陣列'
              />
              <Button block color='primary' loading={loading} style={{ marginTop: 12 }} onClick={handleSaveJson}>
                儲存 JSON
              </Button>
            </Tabs.Tab>
          </Tabs>
        </Tabs.Tab>

        <Tabs.Tab title='劇本生成' key='generate'>
          <Collapse defaultActiveKey={[]}>
            <Collapse.Panel key='config' title='參數設定'>
              <Form
                form={generateForm}
                initialValues={{ targetDailyChange: 0.05, bullMarketDrift: 0.1, decayRate: 0.9 }}
                onFinish={handleGenerate}
              >
                <Form.Item name='targetDailyChange' label='單日漲跌幅目標 (倍數)'>
                  <Input type='number' step='0.01' placeholder='0.2' />
                </Form.Item>
                <Form.Item name='bullMarketDrift' label='牛市漂移 (價格增量)'>
                  <Input type='number' step='0.01' placeholder='0.1' />
                </Form.Item>
                <Form.Item name='decayRate' label='趨勢遞減率 (倍數)'>
                  <Input type='number' step='0.01' placeholder='0.9' />
                </Form.Item>
              </Form>
            </Collapse.Panel>
          </Collapse>

          <Button block type='button' color='primary' loading={loading} style={{ marginTop: 16 }} onClick={handleGenerateClick}>
            產生股票數據
          </Button>

          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 8 }}>劇本預覽</h4>
            <div style={{ height: 260 }}>
              <StockChart data={priceHistory} showAll />
            </div>
          </div>

          <List header='微調 (逐日覆寫價格/新聞)'>
            {script.map((d) => (
              <List.Item
                key={d.day}
                description={`價格: ${d.price} | 趨勢: ${trendEnumToCN[d.effectiveTrend] || d.effectiveTrend}`}
                extra={
                  <Button size='mini' color='primary' onClick={() => handleOpenEditDay(d)}>
                    編輯
                  </Button>
                }
              >
                第 {d.day} 天 {d.title || ''}
              </List.Item>
            ))}
          </List>
        </Tabs.Tab>

        <Tabs.Tab title='驗證劇本' key='validate'>
          <Button block color='primary' loading={loading} onClick={handleRunSimulation}>
            開始模擬
          </Button>
          <List header='模擬結果 (1000 次)'>
            {simResult.map((row) => (
              <List.Item
                key={row.name}
                description={`最小: ${row.stats.min} | Q1: ${row.stats.q1} | 中位數: ${row.stats.q2} | Q3: ${row.stats.q3} | 最大: ${row.stats.max}`}
              >
                {simNameToCN[row.name] || row.name}（平均: {row.stats.avg}）
              </List.Item>
            ))}
          </List>
        </Tabs.Tab>
      </Tabs>

      <Popup
        visible={editPopupOpen}
        closeOnMaskClick={false}
        onClose={() => setEditPopupOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxWidth: '96vw', margin: '0 auto' }}
      >
        <h4 style={{ marginBottom: 12 }}>微調第 {editDayData?.day} 天</h4>
        <Form
          form={editDayForm}
          layout='horizontal'
          onFinish={handleUpdateDay}
          footer={
            <Space justify='between' style={{ width: '100%' }}>
              <Button onClick={() => setEditPopupOpen(false)}>取消</Button>
              <Button type='submit' color='primary' loading={loading}>儲存</Button>
            </Space>
          }
        >
          <Form.Item name='price' label='價格' rules={[{ required: true, message: '必填' }]}>
            <Input type='number' />
          </Form.Item>
          <Form.Item name='title' label='標題'>
            <Input placeholder='可選填' />
          </Form.Item>
          <Form.Item name='news' label='內文'>
            <Input placeholder='可選填' />
          </Form.Item>
        </Form>
      </Popup>

      <Popup
        visible={eventModalOpen}
        closeOnMaskClick={false}
        onClose={() => setEventModalOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxWidth: '96vw', margin: '0 auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>{editingEvent?.id ? '編輯事件' : '新增事件'}</h4>
          <Button size='mini' color='primary' onClick={() => setEventModalOpen(false)}>
            Ｘ
          </Button>
        </div>
        <Form
          form={eventForm}
          layout='horizontal'
          initialValues={editingEvent}
          onFinish={handleSaveEvent}
          footer={
            <Space justify='between' style={{ width: '100%' }}>
              <Button onClick={() => setEventModalOpen(false)}>取消</Button>
              <Button color='primary' loading={loading} type='submit'>
                儲存事件
              </Button>
            </Space>
          }
        >
          <Form.Item name='id' hidden>
            <Input type='hidden' />
          </Form.Item>
          <Form.Item name='day' label='Day' rules={[{ required: true, message: '必填' }]}>
            <Input type='number' placeholder='1' />
          </Form.Item>
          <Form.Item name='title' label='標題' rules={[{ required: true, message: '必填' }]}>
            <Input placeholder='新聞標題' />
          </Form.Item>
          <Form.Item name='news' label='內文'>
            <Input placeholder='新聞內文 (可空)' />
          </Form.Item>
          <Form.Item name='trend' label='趨勢' rules={[{ required: true, message: '必填' }]}>
            <select style={{ width: '100%', padding: '8px' }}>
              {trendOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Form.Item>
        </Form>
      </Popup>

      <Popup
        visible={jsonHelpOpen}
        closeOnMaskClick={false}
        onClose={() => setJsonHelpOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '70vh', overflowY: 'auto', maxWidth: '96vw', margin: '0 auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>JSON 模式提示</h4>
          <Button size='mini' color='primary' onClick={() => setJsonHelpOpen(false)}>
            Ｘ
          </Button>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>
{`- 請貼上 JSON 陣列，格式需為 [ { ... }, { ... } ]
- 依照 day 由小到大排序
- trend 必須為「超利多 / 利多 / 盤整 / 利空 / 超利空 / 不影響」其一
- 欄位：day, title (必填), news (可空), trend (必填)
`}
        </div>
        <Button block style={{ marginTop: 12 }} onClick={() => setJsonHelpOpen(false)}>關閉</Button>
      </Popup>

      <Popup
        visible={aiPromptOpen}
        closeOnMaskClick={false}
        onClose={() => setAiPromptOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '75vh', overflowY: 'auto', maxWidth: '96vw', margin: '0 auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>建立事件 ChatGPT 術語</h4>
          <Button size='mini' color='primary' onClick={() => setAiPromptOpen(false)}>
            Ｘ
          </Button>
        </div>
        <Form
          layout='horizontal'
          onFinish={(values) => {
            const totalDays = values.totalDays ?? 120;
            const keyCount = values.keyCount ?? 15;
            const dramatic = values.dramatic ?? 3;
            const background = values.background?.trim();

            const promptLines = [
              '請幫我扮演一個財經新聞編輯與分析師。',
              `請為一個 ${totalDays} 天的虛擬股票遊戲生成 ${keyCount} 個「關鍵日事件」。`,
            ];

            if (background) {
              promptLines.push(`我們的背景是（${background}），新聞請盡量與此相關。`);
            }

            promptLines.push(
              '請嚴格依照以下 JSON 陣列格式提供，並依照 "day" 欄位由小到大排序： [ { "day": (數字), "title": "新聞標題...", "news": "新聞的詳細內容...", "trend": "趨勢" } ]',
              '',
              '- "day" 必須是 1 到 120 之間的數字。',
              '- "trend" 必須是 "超利多", "利多", "盤整", "利空", "超利空", "不影響" 這六個字串之一。',
              '- 請確保輸出是單一的、可直接複製的 JSON 陣列，無註解，並且依照 "day" 欄位由小到大排序。',
              '',
              '$$ 戲劇性劇本要求 $$',
              `請在 ${keyCount} 個事件中，刻意安插確切 ${dramatic} 個「戲劇性事件」。`,
              '「戲劇性事件」的定義是：',
              '反直覺事件：新聞標題和內文表面上看起來是利多，但 trend 欄位卻故意設為 "利空" 或 "超利空"。（反之亦然：表面利空，實際利多）',
              '解釋性事件：在該「反直覺事件」的下一個關鍵日，提供合理的新聞標題和內文，用來「解釋」前一個事件為何會反直覺。這個「解釋性事件」的 trend 應設為 "不影響"，因為市場已消化該消息。',
              '',
              '請直接輸出 JSON 陣列，無需額外說明。',
              '',
              '範例：',
              '[',
              '  { "day": 10, "title": "新產品發表！", "news": "公司今日舉行盛大的新品發表會...", "trend": "超利多" },',
              '  { "day": 25, "title": "工廠失火", "news": "主要產線因火災暫停，損失評估中。", "trend": "利空" },',
              '  { "day": 40, "title": "震撼！新產品『X-Vision』驚艷發表！", "news": "公司今日發表劃時代新產品 X-Vision...", "trend": "超利空" },',
              '  { "day": 42, "title": "X-Vision 成本曝光，市場嘩然", "news": "多家投顧報告指出，X-Vision 每賣一台的虧損高達 300 美元...", "trend": "不影響" },',
              '  { "day": 46, "title": "財報平平", "news": "財報沒有亮點", "trend": "盤整" }',
              ']'
            );

            setAiPromptOutput(promptLines.join('\n'));
            Toast.show({ icon: 'success', content: '已產生術語，請下滑複製' });
          }}
          footer={
            <Button type='submit' color='primary' block>
              產生術語
            </Button>
          }
        >
          <Form.Item name='totalDays' label='總天數' initialValue={120}>
            <Input type='number' placeholder='120' />
          </Form.Item>
          <Form.Item name='keyCount' label='關鍵日數量' initialValue={40}>
            <Input type='number' placeholder='40' />
          </Form.Item>
          <Form.Item name='dramatic' label='戲劇性事件' initialValue={10}>
            <Input type='number' placeholder='10' />
          </Form.Item>
          <Form.Item name='background' label='公司背景'>
            <TextArea placeholder='例如：一家電商公司，主打跨境快時尚' autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>AI 術語</span>
            <Button
              size='mini'
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(aiPromptOutput || '');
                  Toast.show({ icon: 'success', content: '已複製' });
                } catch (err) {
                  Toast.show({ icon: 'fail', content: '複製失敗，請手動選取' });
                }
              }}
            >
              複製
            </Button>
          </div>
          <TextArea
            value={aiPromptOutput}
            readOnly
            autoSize={{ minRows: 6, maxRows: 10 }}
            placeholder='按「產生術語」後顯示'
          />
        </div>

        <Button block style={{ marginTop: 12 }} onClick={() => setAiPromptOpen(false)}>
          關閉
        </Button>
      </Popup>
    </div>
  );
};

export default AdminScriptTab;
