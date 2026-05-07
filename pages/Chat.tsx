import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../App';
import { Message, Profile } from '../types';

const Chat: React.FC = () => {
    const { profile: currentUser, hasPermission } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [users, setUsers] = useState<Profile[]>([]);
    const [activeChannel, setActiveChannel] = useState<string>('general');
    const [activeChatUser, setActiveChatUser] = useState<Profile | null>(null);

    // Sidebar on mobile state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const getChannelId = (uid1: string, uid2: string) => {
        return uid1 < uid2 ? `dm_${uid1}_${uid2}` : `dm_${uid2}_${uid1}`;
    };

    // Fetch all users once
    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });
            if (!error && data) {
                // Remove self from the list
                setUsers(data.filter(u => u.id !== currentUser?.id));
            }
        };
        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    // Handle messages fetch and subscription when activeChannel changes
    useEffect(() => {
        if (!currentUser) return;
        setLoading(true);

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id, sender_id, channel, content, created_at,
                    profiles:sender_id ( full_name, avatar, role )
                `)
                .eq('channel', activeChannel)
                .order('created_at', { ascending: true })
                .limit(100);

            if (!error && data) {
                // @ts-ignore
                setMessages(data);
            }
            setLoading(false);
            scrollToBottom();
        };

        fetchMessages();

        // Subscribe to real-time messages for the ACTIVE CHANNEL ONLY
        const channelObj = supabase
            .channel(`messages_${activeChannel}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${activeChannel}` },
                async (payload) => {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('full_name, avatar, role')
                        .eq('id', payload.new.sender_id)
                        .single();

                    const newMsg: Message = {
                        ...(payload.new as Message),
                        profiles: profileData
                    };

                    setMessages((current) => [...current, newMsg]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channelObj);
        };
    }, [activeChannel, currentUser]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        const content = newMessage.trim();
        setNewMessage(''); // optimistic clear

        const { error } = await supabase.from('messages').insert([
            {
                sender_id: currentUser.id,
                channel: activeChannel,
                content: content
            }
        ]);

        if (error) {
            console.error('Error sending message:', error);
            // Optionally handle error UI
        }
    };

    if (!hasPermission('dashboard:view')) { // Standard fallback permission
        return <div className="p-4 text-red-500">Bạn không có quyền truy cập trang này.</div>;
    }

    const switchChannel = (channel: string, user: Profile | null = null) => {
        setActiveChannel(channel);
        setActiveChatUser(user);
        setIsSidebarOpen(false); // Hide sidebar on mobile when selected
    };

    return (
        <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 lg:-mt-6">
            {/* Sidebar Kênh Chat */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
                <div className="px-4 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Trò chuyện</h2>
                    <p className="text-sm text-gray-500">Kết nối nội bộ</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {/* General Channel */}
                    <div 
                        onClick={() => switchChannel('general')}
                        className={`px-4 py-3 cursor-pointer flex items-center hover:bg-gray-50 transition-colors border-b border-gray-100 ${activeChannel === 'general' ? 'bg-indigo-50 border-r-4 border-r-indigo-500' : ''}`}
                    >
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 text-indigo-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Kênh Thảo Luận Chung</h3>
                            <p className="text-xs text-gray-500">Tin nhắn cho toàn hệ thống</p>
                        </div>
                    </div>

                    <div className="px-4 py-2 mt-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tin nhắn riêng
                    </div>

                    {/* Users List */}
                    {users.map(user => {
                        if (!currentUser) return null;
                        const channelId = getChannelId(currentUser.id, user.id);
                        const isActive = activeChannel === channelId;
                        return (
                            <div 
                                key={user.id}
                                onClick={() => switchChannel(channelId, user)}
                                className={`px-4 py-3 cursor-pointer flex items-center hover:bg-gray-50 transition-colors border-b border-gray-50 ${isActive ? 'bg-indigo-50 border-r-4 border-r-indigo-500' : ''}`}
                            >
                                <img 
                                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=random`} 
                                    alt="avatar" 
                                    className="w-10 h-10 rounded-full mr-3 flex-shrink-0 border border-gray-200"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 truncate">{user.full_name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{user.role || 'Người dùng'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Vùng Chat Chính */}
            <div className={`flex-1 flex flex-col bg-white overflow-hidden transition-all duration-300 ${!isSidebarOpen ? 'block' : 'hidden md:flex'}`}>
                {/* Header */}
                <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center">
                        {/* Mobile Back Button */}
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden mr-3 p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        
                        {activeChatUser ? (
                            <div className="flex items-center">
                                <img 
                                    src={activeChatUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser.full_name || 'User')}&background=random`} 
                                    alt="avatar" 
                                    className="w-10 h-10 rounded-full mr-3 hidden sm:block border border-gray-200"
                                />
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{activeChatUser.full_name}</h2>
                                    <p className="text-sm text-gray-500">{activeChatUser.role || 'Người dùng'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3 hidden sm:flex text-indigo-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Kênh Thảo Luận Chung</h2>
                                    <p className="text-sm text-gray-500 hidden sm:block">Trao đổi nội bộ toàn hệ thống</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f0f2f5] space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-full text-gray-500">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isMe = msg.sender_id === currentUser?.id;
                            const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
                            
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                                    {!isMe && showAvatar && (
                                        <div className="flex-shrink-0 mr-3 mt-1">
                                            <img 
                                                src={msg.profiles?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.profiles?.full_name || 'User')}&background=random`} 
                                                alt="avatar" 
                                                className="w-8 h-8 rounded-full shadow-sm border border-gray-200"
                                            />
                                        </div>
                                    )}
                                    {!isMe && !showAvatar && <div className="w-11"></div>}
                                    
                                    <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showAvatar && !isMe && activeChannel === 'general' && (
                                            <div className="flex items-center space-x-2 mb-1 ml-1">
                                                <span className="text-xs font-semibold text-gray-600">{msg.profiles?.full_name}</span>
                                                {msg.profiles?.role && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">{msg.profiles?.role}</span>}
                                            </div>
                                        )}
                                        <div className={`px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-[#d9fdd3] text-gray-800 rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'}`}>
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 mx-1">
                                            {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 md:p-4 bg-[#f0f2f5] border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex space-x-2 items-center bg-white p-2 rounded-full shadow-sm border border-gray-200">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={activeChatUser ? `Nhắn tin cho ${activeChatUser.full_name}...` : "Nhập tin nhắn..."}
                            className="flex-1 px-4 py-2 bg-transparent border-transparent focus:ring-0 focus:outline-none text-sm"
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-2.5 bg-secondary text-white rounded-full hover:bg-secondary-dark focus:outline-none disabled:opacity-50 disabled:bg-gray-300 transition-colors"
                        >
                            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chat;
