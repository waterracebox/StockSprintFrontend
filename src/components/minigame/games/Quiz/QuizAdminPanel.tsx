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

    const isQuiz = status.gameType === 'QUIZ';

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
        form.setFieldsValue(question);
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
            // 將正確答案轉為大寫
            const normalizedValues = {
                ...values,
                correctAnswer: values.correctAnswer.toUpperCase(),
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
                <Card
                    title='題庫列表'
                    extra={
                        <Button size='mini' color='primary' onClick={handleOpenCreate} disabled={isQuiz}>
                            新增題目
                        </Button>
                    }
                >
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
                </Card>

                <Button
                    color='primary'
                    onClick={handleInitGame}
                    disabled={isQuiz}
                    style={{ width: 230, maxWidth: '100%' }}
                >
                    初始化遊戲 (進入待機)
                </Button>
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
                </Form>
            </Popup>
        </div>
    );
};

export default QuizAdminPanel;
