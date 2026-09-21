'use client';

import React, { useState } from 'react';
import { Hash, Send, Paperclip, Smile, Users, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const ChatView: React.FC = () => {
  const {
    channels,
    messages,
    activeChannelId,
    setActiveChannelId,
    sendMessage,
    users,
    currentUser,
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState('');

  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages.filter((m) => m.channelId === currentChannel.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(currentChannel.id, inputMessage);
    setInputMessage('');
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex select-none animate-fade-in">
      {/* Channels Sidebar */}
      <div className="w-60 border-r border-border bg-card/40 p-3 space-y-4 shrink-0 hidden sm:block">
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">Team Channels</h3>
        <div className="space-y-1">
          {channels.map((chan) => (
            <button
              key={chan.id}
              onClick={() => setActiveChannelId(chan.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                chan.id === currentChannel.id
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Hash size={15} />
              <span className="truncate">{chan.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 flex flex-col bg-card/20">
        {/* Chat Header */}
        <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-primary" />
            <span className="font-bold text-sm text-foreground">{currentChannel.name}</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {channelMessages.map((msg) => {
            const sender = users.find((u) => u.id === msg.senderId) || currentUser;
            const isMe = msg.senderId === currentUser.id;

            return (
              <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <img src={sender.avatar} alt={sender.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                <div className={`space-y-1 max-w-md ${isMe ? 'items-end text-right' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-bold text-foreground">{sender.name}</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs ${
                      isMe
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                        : 'bg-card border border-border text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-card/60 flex items-center gap-2">
          <input
            type="text"
            placeholder={`Message #${currentChannel.name}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md transition-all"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
