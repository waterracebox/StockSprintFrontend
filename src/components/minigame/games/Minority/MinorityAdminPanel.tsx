import React, { useEffect, useState } from 'react';
import { Button, Card, Dialog, Form, Input, List, Popup, Space, Toast } from 'antd-mobile';
import type { Socket } from 'socket.io-client';
import type { MiniGameSyncState } from '../../containers/MiniGameOverlay';
import { minorityService, type MinorityQuestion, type MinorityPayload } from '../../../../services/minorityService';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 【新增】Sortable Item 組件
interface SortableItemProps {
    question: MinorityQuestion;
    index: number;
    isMinority: boolean;
    onEdit: (q: MinorityQuestion) => void;
    onDelete: (id: number) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ question, index, isMinority, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id, disabled: isMinority });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isMinority ? 'not-allowed' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <List.Item
                style={{ paddingLeft: 0, paddingRight: 0 }}
                prefix={
                    <div
                        {...attributes}
                        {...(isMinority ? {} : listeners)}
                        style={{
                            touchAction: 'none',
                            cursor: isMinority ? 'not-allowed' : 'grab',
                            fontSize: 16,
                            padding: '0 4px',
                            marginRight: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            userSelect: 'none',
                            color: isMinority ? '#cccccc' : '#000000',
                        }}
                    >
                        ☰
                    </div>
                }
                description={`時間: ${question.duration}秒`}
                extra={
                    <Space direction='vertical' style={{ gap: 4 }}>
                        <Button size='mini' color='primary' fill='outline' onClick={() => onEdit(question)} disabled={isMinority}>
                            編輯
                        </Button>
                        <Button size='mini' color='danger' fill='outline' onClick={() => onDelete(question.id)} disabled={isMinority}>
                            刪除
                        </Button>
                    </Space>
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                        fontWeight: 'bold', 
                        color: '#1677ff',
                        minWidth: 24,
                    }}>
                        #{index + 1}
                    </span>
                    <span>{question.question}</span>
                </div>
            </List.Item>
        </div>
    );
};

interface Props {
    status: MiniGameSyncState;
    socket: Socket | null;
}

const MinorityAdminPanel: React.FC<Props> = ({ status, socket }) => {
    const [questions, setQuestions] = useState<MinorityQuestion[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<MinorityQuestion | null>(null);
    const [form] = Form.useForm<MinorityPayload>();
    
    // 【新增】本地選擇的題目 ID (受控於 status.data.nextCandidateId)
    const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

    const isMinority = status.gameType === 'MINORITY';

    // 【新增】判斷是否可以發布題目（僅在 IDLE 或 RESULT 階段）
    const normalizedPhase = (status.phase || '').toUpperCase();
    const canPublish = normalizedPhase === 'IDLE' || normalizedPhase === 'RESULT';

    // 【新增】Drag & Drop Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const loadQuestions = async () => {
        try {
            const data = await minorityService.getQuestions();
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
            gameType: 'MINORITY',
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

        socket.emit('ADMIN_MINIGAME_ACTION', { type: 'INIT_GAME', gameType: 'MINORITY' });
        Toast.show({ icon: 'success', content: '已送出初始化指令' });
    };

    const handleOpenCreate = () => {
        if (isMinority) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改題目' });
            return;
        }
        setEditingQuestion(null);
        form.resetFields();
        form.setFieldsValue({ duration: 10 });
        setModalOpen(true);
    };

    const handleOpenEdit = (question: MinorityQuestion) => {
        if (isMinority) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法修改題目' });
            return;
        }
        setEditingQuestion(question);
        form.setFieldsValue(question);
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (isMinority) {
            Toast.show({ icon: 'fail', content: '遊戲進行中，無法刪除題目' });
            return;
        }

        const confirmed = await Dialog.confirm({ content: '確認刪除此題目嗎？', closeOnMaskClick: false });
        if (!confirmed) return;

        try {
            await minorityService.deleteQuestion(id);
            Toast.show({ icon: 'success', content: '已刪除' });
            loadQuestions();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '刪除題目失敗' });
        }
    };

    const handleSubmit = async (values: MinorityPayload) => {
        try {
            if (editingQuestion) {
                await minorityService.updateQuestion(editingQuestion.id, values);
                Toast.show({ icon: 'success', content: '已更新題目' });
            } else {
                await minorityService.createQuestion(values);
                Toast.show({ icon: 'success', content: '已新增題目' });
            }
            setModalOpen(false);
            loadQuestions();
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: error?.response?.data?.error || '儲存題目失敗' });
        }
    };

    // 【新增】處理拖曳結束
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = questions.findIndex((q) => q.id === active.id);
        const newIndex = questions.findIndex((q) => q.id === over.id);

        const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
        
        // 樂觀更新 UI
        setQuestions(reorderedQuestions);

        // 呼叫 API 更新 sortOrder
        try {
            const ids = reorderedQuestions.map((q) => q.id);
            await minorityService.reorderQuestions(ids);
            Toast.show({ icon: 'success', content: '已更新排序' });
        } catch (error: any) {
            Toast.show({ icon: 'fail', content: '更新排序失敗' });
            loadQuestions(); // 失敗時重新載入
        }
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <Space direction='vertical' block>
                {/* 【新增】選題與發布區 */}
                {isMinority && questions.length > 0 && (
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
                                    ? `#${questions.findIndex(q => q.id === selectedQuestionId) + 1}. ${questions.find(q => q.id === selectedQuestionId)?.question.substring(0, 40) || ''}...`
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
                                                    {questions.map((q, index) => (
                                                        <List.Item
                                                            key={q.id}
                                                            onClick={() => {
                                                                setSelectedQuestionId(q.id);
                                                                Dialog.clear();
                                                            }}
                                                            style={{ 
                                                                cursor: 'pointer',
                                                                background: selectedQuestionId === q.id ? '#e6f7ff' : 'transparent'
                                                            }}
                                                        >
                                                            <div style={{ fontWeight: selectedQuestionId === q.id ? 700 : 400 }}>
                                                                #{index + 1}: {q.question}
                                                            </div>
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

                <Card
                    title='題庫列表'
                    extra={
                        <Button size='mini' color='primary' onClick={handleOpenCreate} disabled={isMinority}>
                            新增題目
                        </Button>
                    }
                >
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={questions.map((q) => q.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <List>
                                    {questions.map((q, index) => (
                                        <SortableItem
                                            key={q.id}
                                            question={q}
                                            index={index}
                                            isMinority={isMinority}
                                            onEdit={handleOpenEdit}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                    {questions.length === 0 && <List.Item>尚無題目，請新增。</List.Item>}
                                </List>
                            </SortableContext>
                        </DndContext>
                    </div>
                </Card>

                {!isMinority && (
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
                    <Form.Item name='duration' label='下注時間(秒)'>
                        <Input type='number' placeholder='預設 10 秒' />
                    </Form.Item>
                </Form>
            </Popup>
        </div>
    );
};

export default MinorityAdminPanel;
