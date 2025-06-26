// src/frontend/src/components/documents/ViewMetadataModal.js
import React from 'react';
import { FiInfo } from 'react-icons/fi';
import Modal from '../common/Modal';
import MetadataPanel from './MetadataPanel';

function ViewMetadataModal({ isOpen, onClose, document }) {
  if (!document) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center space-x-2">
          <FiInfo className="w-5 h-5 text-blue-600" />
          <span>Chi tiết Metadata</span>
        </div>
      }
      size="lg"
    >
      <div className="max-h-96 overflow-y-auto">
        <MetadataPanel 
          document={document}
          isLoading={false}
          onRefresh={() => {}} // Không cần refresh trong modal
        />
      </div>
      
      <div className="flex justify-end pt-4 border-t mt-4">
        <button
          onClick={onClose}
          className="btn btn-outline"
        >
          Đóng
        </button>
      </div>
    </Modal>
  );
}

export default ViewMetadataModal;
