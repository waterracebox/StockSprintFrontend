import React, { useEffect, useState } from 'react';
import { Button, Card, Dialog, Form, Input, List, Popup, Space, Toast } from 'antd-mobile';
import type { Socket } from 'socket.io-client';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import { quizService, type QuizQuestion, type QuizPayload } from '../../../../services/quizService';

interface Props {
    status: MiniGameSyncState;
    socket: Socket | null;
}

const QuizAdminPanel: React.FC<Props> = ({ status, socket }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
    const [form] = Form.useForm<QuizPayload>();

    // 【新增】本地選擇的題目 ID (受控於 status.data.nextCandidateId)
    const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

    const isQuiz = status.gameType === 'QUIZ';

    // 【新增】判斷是否可以選擇/發布題目（僅在 IDLE 或 RESULT 階段）
    const normalizedPhase = (status.phase || '').toUpperCase();
    const canPublish = normalizedPhase === 'IDLE' || normalizedPhase === 'RESULT';

    const loadQuestions = async () => {
        try {
            const data = await quizService.getQuestions();
            setQuestions(data);
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '讀取題庫失敗' });
        }
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    // 【新增】同步 Dropdown 值與 gameState
    useEffect(() => {
        const candidateId = status.data?.nextCandidateId as number | undefined;
        if (candidateId !== undefined && candidateId !== null) {
            setSelectedQuestionId(candidateId);
        }
    }, [status.data?.nextCandidateId]);

    // 【新增】當進入 PREPARE 階段時（剛發布題目），強制同步 nextCandidateId
    useEffect(() => {
        if (status.phase === 'PREPARE') {
            const candidateId = status.data?.nextCandidateId as number | undefined;
            if (candidateId !== undefined && candidateId !== null) {
                setSelectedQuestionId(candidateId);
            }
        }
    }, [status.phase, status.data?.nextCandidateId]);

    // 【新增】發布題目邏輯
    const handlePublishQuestion = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }

        if (selectedQuestionId === null) {
            Toast.show({ icon: 'fail', content: '請先選擇題目' });
            return;
        }

        socket.emit('ADMIN_MINIGAME_ACTION', { 
            type: 'INIT_GAME', 
            gameType: 'QUIZ',
            questionId: selectedQuestionId 
        });
        
        Toast.show({ icon: 'success', content: '已發布題目' });
    };

    const handleInitGame = () => {
        if (!socket) {
            Toast.show({ icon: 'fail', content: '尚未連線，請稍後重試' });
            return;
        }

        if (questions.length === 0) {
            Toast.show({ icon: 'fail', content: '題庫為空，請先新增題目' });
            return;
        }

        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'INIT_GAME', gameType: 'QUIZ' });
        Toast.show({ icon: 'success', content: '已送出初始化指令' });
    };

    const handleOpenCreate = () => {
        if (isQuiz) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改題目' });
            return;
        }
        setEditingQuestion(null);
        form.resetFields();
        form.setFieldsValue({
            correctAnswer: 'A',
            duration: 10,
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (question: QuizQuestion) => {
        if (isQuiz) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改題目' });
            return;
        }
        setEditingQuestion(question);
        form.setFieldsValue({
            ...question,
            rewards: question.rewards || { first: 100, second: 50, third: 30, others: 10 }, // 【確保有預設值】
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (isQuiz) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法刪除題目' });
            return;
        }

        const confirmed = await Dialog.confirm({ content: '確認刪除此題目嗎？', closeOnMaskClick: false });
        if (!confirmed) return;

        try {
            await quizService.deleteQuestion(id);
            Toast.show({ icon: 'success', content: '已刪除' });
            loadQuestions();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '刪除題目失敗' });
        }
    };

    const handleSubmit = async (values: QuizPayload) => {
        try {
            // 【新增】驗證獎勵欄位
            const rewards = {
                first: Number(values.rewards?.first) || 100,
                second: Number(values.rewards?.second) || 50,
                third: Number(values.rewards?.third) || 30,
                others: Number(values.rewards?.others) || 10,
            };

            if (rewards.first <= 0 || rewards.second <= 0 || rewards.third <= 0 || rewards.others <= 0) {
                Toast.show({ icon: 'fail', content: '所有獎勵必須為正數' });
                return;
            }

            const normalizedValues = {
                ...values,
                correctAnswer: values.correctAnswer.toUpperCase(),
                rewards, // 【新增】確保送出完整獎勵結構
            };

            if (editingQuestion) {
                await quizService.updateQuestion(editingQuestion.id, normalizedValues);
                Toast.show({ icon: 'success', content: '已更新題目' });
            } else {
                await quizService.createQuestion(normalizedValues);
                Toast.show({ icon: 'success', content: '已新增題目' });
            }
            setModalOpen(false);
            loadQuestions();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '儲存題目失敗' });
        }
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <Space direction='vertical' block>
                {/* 【優化】選題與發布區 - 在遊戲進行中也保持顯示 */}
                {isQuiz && questions.length > 0 && (
                    <Card title='📢 發布題目' style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#fff' }}>
                        <Space direction='vertical' block>
                            <div style={{ 
                                padding: '8px 12px', 
                                background: '#f5f5f5', 
                                borderRadius: 8,
                                fontSize: 14,
                                color: '#666'
                            }}>
                                <strong>目前選擇：</strong>
                                {selectedQuestionId 
                                    ? `Q${selectedQuestionId}: ${questions.find(q => q.id === selectedQuestionId)?.question.substring(0, 40) || ''}...`
                                    : '尚未選擇'
                                }
                            </div>
                            <Button 
                                color='primary' 
                                onClick={() => {
                                    // 彈出選題 Popup
                                    Dialog.show({
                                        title: '選擇題目',
                                        content: (
                                            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                                <List>
                                                    {questions.map((q) => (
                                                        <List.Item
                                                            key={q.id}
                                                            clickable
                                                            onClick={() => {
                                                                setSelectedQuestionId(q.id);
                                                                Dialog.clear();
                                                            }}
                                                            style={{ 
                                                                background: selectedQuestionId === q.id ? '#e6f7ff' : 'transparent',
                                                                borderLeft: selectedQuestionId === q.id ? '3px solid #1677ff' : 'none'
                                                            }}
                                                        >
                                                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Q{q.id}</div>
                                                            <div>{q.question}</div>
                                                        </List.Item>
                                                    ))}
                                                </List>
                                            </div>
                                        ),
                                        closeOnAction: true,
                                        actions: [{ key: 'close', text: '取消' }],
                                    });
                                }}
                                disabled={!canPublish}
                                block
                            >
                                🔍 選擇題目
                            </Button>
                            <Button 
                                color='success' 
                                onClick={handlePublishQuestion}
                                disabled={selectedQuestionId === null || !canPublish}
                                block
                                size='large'
                            >
                                📢 發布題目（自動開始）
                            </Button>
                        </Space>
                    </Card>
                )}

                {/* 【優化】題庫列表 - 限制高度 */}
                <Card
                    title='題庫列表'
                    extra={
                        <Button size='mini' color='primary' onClick={handleOpenCreate} disabled={isQuiz}>
                            新增題目
                        </Button>
                    }
                >
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <List>
                            {questions.map((q) => (
                                <List.Item
                                    key={q.id}
                                    description={`答案: ${q.correctAnswer} | 時間: ${q.duration}秒`}
                                    extra={
                                        <Space direction='vertical' style={{ gap: 4 }}>
                                            <Button size='mini' color='primary' fill='outline' onClick={() => handleOpenEdit(q)} disabled={isQuiz}>
                                                編輯
                                            </Button>
                                            <Button size='mini' color='danger' fill='outline' onClick={() => handleDelete(q.id)} disabled={isQuiz}>
                                                刪除
                                            </Button>
                                        </Space>
                                    }
                                >
                                    {q.question}
                                </List.Item>
                            ))}
                            {questions.length === 0 && <List.Item>尚無題目，請新增。</List.Item>}
                        </List>
                    </div>
                </Card>

                {/* 【修改】初始化按鈕改為僅首次使用 */}
                {!isQuiz && (
                    <Button
                        color='primary'
                        onClick={handleInitGame}
                        disabled={status.gameType !== 'NONE'}
                        style={{ width: 230, maxWidth: '100%' }}
                    >
                        初始化遊戲 (進入待機)
                    </Button>
                )}
            </Space>

            <Popup
                visible={modalOpen}
                onClose={() => setModalOpen(false)}
                closeOnMaskClick={false}
                bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16 }}
            >
                <h4 style={{ margin: 0, marginBottom: 12 }}>{editingQuestion ? '編輯題目' : '新增題目'}</h4>
                <Form
                    form={form}
                    layout='horizontal'
                    onFinish={handleSubmit}
                    footer={
                        <Space justify='between' style={{ width: '100%' }}>
                            <Button onClick={() => setModalOpen(false)}>取消</Button>
                            <Button type='submit' color='primary'>儲存</Button>
                        </Space>
                    }
                >
                    <Form.Item name='question' label='題目' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='請輸入題目' />
                    </Form.Item>
                    <Form.Item name='optionA' label='選項 A' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='選項 A' />
                    </Form.Item>
                    <Form.Item name='optionB' label='選項 B' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='選項 B' />
                    </Form.Item>
                    <Form.Item name='optionC' label='選項 C' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='選項 C' />
                    </Form.Item>
                    <Form.Item name='optionD' label='選項 D' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='選項 D' />
                    </Form.Item>
                    <Form.Item name='correctAnswer' label='正確答案' rules={[{ required: true, message: '必填' }]}>
                        <Input placeholder='A, B, C, 或 D' />
                    </Form.Item>
                    <Form.Item name='duration' label='作答時間(秒)'>
                        <Input type='number' placeholder='預設 10 秒' />
                    </Form.Item>
                    
                    {/* 【新增】獎勵設定區塊 */}
                    <div style={{ marginTop: 16, marginBottom: 12, fontWeight: 700, fontSize: 15 }}>獎勵設定 ($)</div>
                    <Form.Item name={['rewards', 'first']} label='第一名' initialValue={100}>
                        <Input type='number' placeholder='例如 100' />
                    </Form.Item>
                    <Form.Item name={['rewards', 'second']} label='第二名' initialValue={50}>
                        <Input type='number' placeholder='例如 50' />
                    </Form.Item>
                    <Form.Item name={['rewards', 'third']} label='第三名' initialValue={30}>
                        <Input type='number' placeholder='例如 30' />
                    </Form.Item>
                    <Form.Item name={['rewards', 'others']} label='其他獎勵' initialValue={10}>
                        <Input type='number' placeholder='例如 10（第四名以後的基礎獎金）' />
                    </Form.Item>
                </Form>
            </Popup>
        </div>
    );
};

export default QuizAdminPanel;
