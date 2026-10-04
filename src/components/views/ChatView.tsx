'use client';

import React, { useState } from 'react';
import { Hash, Send, MessageSquare, User, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '../../context/WorkspaceContext';
import type { Channel } from '../../types';

export const ChatView: React.FC = () => {
  const {
    channels,
    messages,
    activeChannelId,
    setActiveChannelId,
    sendMessage,
    users,
    currentUser,
    setDmModalOpen,
    setChannelModalOpen,
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState('');

  const dmPartner = (chan: Channel) =>
    users.find((u) => u.id !== currentUser.id && chan.memberIds.includes(u.id));

  const displayName = (chan: Channel) =>
    chan.type === 'DIRECT' ? dmPartner(chan)?.name ?? 'Direct Message' : chan.name;

  const teamChannels = channels.filter((c) => c.type !== 'DIRECT');
  const directChannels = channels
    .filter((c) => c.type === 'DIRECT')
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const currentChannel =
    channels.find((c) => c.id === activeChannelId) ||
    teamChannels[0] ||
    directChannels[0];

  if (!currentChannel) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center select-none animate-fade-in">
        <div className="text-center space-y-2 p-6">
          <MessageSquare size={28} className="mx-auto text-dim" />
          <p className="text-sm font-medium text-foreground">No channels yet.</p>
          <p className="text-[13px] text-muted-foreground">
            Create a channel from the sidebar to start your team&apos;s conversation.
          </p>
        </div>
      </div>
    );
  }

  const isDirect = currentChannel.type === 'DIRECT';
  const currentName = displayName(currentChannel);
  const channelMessages = messages.filter((m) => m.channelId === currentChannel.id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    try {
      await sendMessage(currentChannel.id, inputMessage);
      setInputMessage('');
    } catch {
      // Keep the typed text so nothing is lost when the send fails.
      toast.error('Message failed to send. Please try again.');
    }
  };

  const rowClass = (active: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      active ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
    }`;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex select-none animate-fade-in">
      {/* Channels Sidebar */}
      <div className="w-60 border-r border-border bg-card/40 p-3 space-y-4 shrink-0 hidden sm:block overflow-y-auto">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Team Channels</h3>
          <button
            type="button"
            title="Create Channel"
            aria-label="Create Channel"
            onClick={() => setChannelModalOpen(true)}
            className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="space-y-1">
          {teamChannels.map((chan) => (
            <button key={chan.id} onClick={() => setActiveChannelId(chan.id)} className={rowClass(chan.id === currentChannel.id)}>
              <Hash size={15} />
              <span className="truncate">{chan.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-2 pt-2">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Direct Messages</h3>
          <button
            type="button"
            title="New Message"
            aria-label="New Message"
            onClick={() => setDmModalOpen(true)}
            className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="space-y-1">
          {directChannels.length === 0 ? (
            <button
              type="button"
              onClick={() => setDmModalOpen(true)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              Start a conversation
            </button>
          ) : (
            directChannels.map((chan) => {
              const partner = dmPartner(chan);
              return (
                <button
                  key={chan.id}
                  onClick={() => setActiveChannelId(chan.id)}
                  className={rowClass(chan.id === currentChannel.id)}
                >
                  {partner?.avatar ? (
                    <img src={partner.avatar} alt={partner.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                  ) : (
                    <User size={15} />
                  )}
                  <span className="truncate">{displayName(chan)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Feed */}
      <div className="flex-1 flex flex-col bg-card/20">
        {/* Chat Header */}
        <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">
            {isDirect ? <User size={16} className="text-primary" /> : <Hash size={16} className="text-primary" />}
            <span className="font-bold text-sm text-foreground">{currentName}</span>
            {isDirect && <span className="text-[10px] text-muted-foreground">Direct message</span>}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {channelMessages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-8">
              {isDirect ? `This is the start of your conversation with ${currentName}.` : 'No messages yet — say hi!'}
            </p>
          )}
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
            placeholder={isDirect ? `Message ${currentName}...` : `Message #${currentName}...`}
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
