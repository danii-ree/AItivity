'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Trash2, Edit2, Save, X, Maximize2, Minimize2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Project Ideas',
      content: 'Brainstorm new features for the productivity app...',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'Meeting Notes',
      content: 'Discussed timeline and deliverables...',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [modalFullScreen, setModalFullScreen] = useState(false);
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [modalEditTitle, setModalEditTitle] = useState('');
  const [modalEditContent, setModalEditContent] = useState('');

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const saveNote = () => {
    if (selectedNote) {
      setNotes(notes.map(note =>
        note.id === selectedNote.id
          ? { ...note, title: editTitle, content: editContent, updatedAt: new Date() }
          : note
      ));
      setSelectedNote({ ...selectedNote, title: editTitle, content: editContent });
      setIsEditing(false);
    }
  };

  const cancelEditing = () => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(false);
    }
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const createNote = () => {
    if (newNote.title.trim() || newNote.content.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        title: newNote.title || 'Untitled',
        content: newNote.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNotes([note, ...notes]);
      setNewNote({ title: '', content: '' });
      setShowNewNote(false);
      setTimeout(() => selectNote(note), 100);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Notes</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewNote(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </motion.button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Notes List */}
        <div className="w-1/3 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          <div className="p-4 space-y-2">
            <AnimatePresence>
              {notes.map((note, idx) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => selectNote(note)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all
                    ${selectedNote?.id === note.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white truncate flex-1">
                      {note.title}
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </motion.button>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {note.content || 'No content'}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                    {note.updatedAt.toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Note Editor */}
        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-zinc-900 dark:text-white"
                  />
                ) : (
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {selectedNote.title}
                  </h3>
                )}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={saveNote}
                        className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                      >
                        <Save className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={cancelEditing}
                        className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setShowNoteModal(true);
                          setModalFullScreen(false);
                          setIsEditingInModal(false);
                          if (selectedNote) {
                            setModalEditTitle(selectedNote.title);
                            setModalEditContent(selectedNote.content);
                          }
                        }}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title="Open in modal"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={startEditing}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto min-h-[500px]">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full min-h-[500px] bg-transparent focus:outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 resize-none"
                    placeholder="Start writing..."
                  />
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-zinc-900 dark:text-white whitespace-pre-wrap">
                      {selectedNote.content || 'No content'}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a note to view or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note View Modal */}
      <AnimatePresence>
        {showNoteModal && selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => {
              if (!isEditingInModal) {
                setShowNoteModal(false);
              }
            }}
          >
            <motion.div
              initial={modalFullScreen ? { scale: 0.95, opacity: 0 } : { y: '-100%', opacity: 0 }}
              animate={modalFullScreen ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
              exit={modalFullScreen ? { scale: 0.95, opacity: 0 } : { y: '-100%', opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                bg-white dark:bg-zinc-800 shadow-2xl flex flex-col
                ${modalFullScreen 
                  ? 'w-full h-full rounded-none' 
                  : 'w-full max-w-4xl h-[90vh] rounded-t-3xl rounded-b-2xl'
                }
              `}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                {isEditingInModal ? (
                  <input
                    type="text"
                    value={modalEditTitle}
                    onChange={(e) => setModalEditTitle(e.target.value)}
                    className="flex-1 text-2xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-zinc-900 dark:text-white mr-4"
                    placeholder="Note title"
                  />
                ) : (
                  <h3 
                    className="text-2xl font-bold text-zinc-900 dark:text-white cursor-text"
                    onClick={() => {
                      setIsEditingInModal(true);
                      setModalEditTitle(selectedNote.title);
                      setModalEditContent(selectedNote.content);
                    }}
                  >
                    {selectedNote.title}
                  </h3>
                )}
                <div className="flex gap-2">
                  {isEditingInModal ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (selectedNote) {
                            const updatedNote = {
                              ...selectedNote,
                              title: modalEditTitle,
                              content: modalEditContent,
                              updatedAt: new Date()
                            };
                            setNotes(notes.map(note =>
                              note.id === selectedNote.id ? updatedNote : note
                            ));
                            setSelectedNote(updatedNote);
                            setEditTitle(modalEditTitle);
                            setEditContent(modalEditContent);
                          }
                          setIsEditingInModal(false);
                        }}
                        className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setIsEditingInModal(false);
                          setModalEditTitle(selectedNote.title);
                          setModalEditContent(selectedNote.content);
                        }}
                        className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setModalFullScreen(!modalFullScreen)}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title={modalFullScreen ? 'Minimize' : 'Full Screen'}
                      >
                        {modalFullScreen ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowNoteModal(false)}
                        className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {isEditingInModal ? (
                  <textarea
                    value={modalEditContent}
                    onChange={(e) => setModalEditContent(e.target.value)}
                    className="w-full h-full min-h-[400px] bg-transparent focus:outline-none text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 resize-none text-lg leading-relaxed"
                    placeholder="Start writing..."
                  />
                ) : (
                  <div 
                    className="prose dark:prose-invert max-w-none cursor-text"
                    onClick={() => {
                      setIsEditingInModal(true);
                      setModalEditTitle(selectedNote.title);
                      setModalEditContent(selectedNote.content);
                    }}
                  >
                    <p className="text-zinc-900 dark:text-white whitespace-pre-wrap text-lg leading-relaxed">
                      {selectedNote.content || 'No content - click to edit'}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!isEditingInModal && (
                <div className="p-6 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Last updated: {selectedNote.updatedAt.toLocaleDateString()} {selectedNote.updatedAt.toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                    Click on the title or content to edit
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Note Modal */}
      <AnimatePresence>
        {showNewNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNewNote(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">New Note</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Note title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                <textarea
                  placeholder="Note content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 resize-none"
                />
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={createNote}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewNote(false)}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

