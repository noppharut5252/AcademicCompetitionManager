import React from 'react';
import { AlertTriangle, Trash2, Loader2, Check } from 'lucide-react';

interface BatchItem {
    id: string;
    teamName: string;
    score: string;
    rank: string;
    medal: string;
    flag: string;
    isModified: boolean;
}

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    count?: number;
    actionType?: string; // 'delete' | 'updateStatus' | 'removeMember'
    children?: React.ReactNode;
    batchItems?: BatchItem[]; // For ScoreEntry
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, title, description, confirmLabel, confirmColor, onConfirm, onCancel, isLoading, count = 0, actionType, children, batchItems 
}) => {
    if (!isOpen) return null;
    
    // Determine strictness based on count or destructive action
    const isHighVolume = count > 20;
    const isDelete = actionType === 'delete' || actionType === 'removeMember';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden transform scale-100 transition-all ${batchItems ? 'max-w-4xl max-h-[90vh] flex flex-col' : 'max-w-sm'}`}>
                
                {/* Header Icon */}
                {isDelete ? (
                    <div className="bg-red-50 p-6 border-b border-red-100 flex justify-center shrink-0">
                        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                            <Trash2 className="h-8 w-8 text-red-600" />
                        </div>
                    </div>
                ) : !batchItems && (
                    <div className="pt-6 text-center shrink-0">
                        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${confirmColor === 'red' ? 'bg-red-100 text-red-600' : confirmColor === 'green' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {actionType === 'updateStatus' ? <Check className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                        </div>
                    </div>
                )}
                
                <div className={`p-6 text-center ${batchItems ? 'flex-1 overflow-hidden flex flex-col' : ''}`}>
                    {batchItems ? (
                         <div className="flex items-center text-amber-500 mb-4 shrink-0">
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                        </div>
                    ) : (
                        <h3 className={`text-lg leading-6 font-bold ${isDelete ? 'text-red-600' : 'text-gray-900'}`}>{title}</h3>
                    )}
                    
                    {!batchItems && (
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">{description}</p>
                        </div>
                    )}
                    
                    {/* Warning for High Volume */}
                    {isHighVolume && !batchItems && (
                        <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3 text-left">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-orange-800">คำเตือน: เลือกจำนวนมาก ({count})</h4>
                                    <p className="text-xs text-orange-700 mt-1">
                                        การทำรายการพร้อมกันจำนวนมากอาจทำให้ระบบทำงานช้าหรือเกิดข้อผิดพลาดได้ แนะนำให้ทำครั้งละไม่เกิน 20 รายการ
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {children}
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2 shrink-0">
                    <button
                        type="button"
                        disabled={isLoading}
                        className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
                            confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 
                            confirmColor === 'green' ? 'bg-green-600 hover:bg-green-700' :
                            confirmColor === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
                            'bg-blue-600 hover:bg-blue-700'
                        } disabled:opacity-50`}
                        onClick={onConfirm}
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmLabel}
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
