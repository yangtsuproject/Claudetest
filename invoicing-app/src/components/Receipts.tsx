'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Receipt } from '@/types';
import { formatDate } from '@/lib/storage';

export default function Receipts() {
  const searchParams = useSearchParams();
  const { data, addReceipt, deleteReceipt, isLoaded } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowUpload(true);
    }
  }, [searchParams]);

  const handleUpload = (receipt: Omit<Receipt, 'id'>) => {
    addReceipt(receipt);
    setShowUpload(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      deleteReceipt(id);
    }
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (viewReceipt) {
    return (
      <ReceiptView
        receipt={viewReceipt}
        onClose={() => setViewReceipt(null)}
        onDelete={() => {
          handleDelete(viewReceipt.id);
          setViewReceipt(null);
        }}
      />
    );
  }

  if (showUpload) {
    return (
      <ReceiptUpload
        onUpload={handleUpload}
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Receipts</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + Upload Receipt
        </button>
      </div>

      {/* Receipt Grid */}
      {data.receipts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-4xl mb-4">🧾</p>
          <p>No receipts uploaded yet</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 text-purple-600 hover:underline"
          >
            Upload your first receipt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.receipts.map((receipt) => (
            <div
              key={receipt.id}
              onClick={() => setViewReceipt(receipt)}
              className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition group"
            >
              <div className="aspect-square bg-slate-100 relative">
                <img
                  src={receipt.imageData}
                  alt={receipt.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              </div>
              <div className="p-2">
                <p className="text-sm font-medium truncate">{receipt.fileName}</p>
                <p className="text-xs text-slate-500">{formatDate(receipt.uploadDate)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Receipt Upload Component
interface ReceiptUploadProps {
  onUpload: (receipt: Omit<Receipt, 'id'>) => void;
  onCancel: () => void;
}

function ReceiptUpload({ onUpload, onCancel }: ReceiptUploadProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [useCamera, setUseCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setUseCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      alert('Could not access camera. Please upload a file instead.');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageData(dataUrl);
        setFileName(`receipt-${new Date().toISOString().slice(0, 10)}.jpg`);
        stopCamera();
      }
    }
  };

  const handleSubmit = () => {
    if (!imageData) return;

    onUpload({
      fileName,
      imageData,
      uploadDate: new Date().toISOString(),
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Upload Receipt</h2>
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="text-slate-600 hover:text-slate-800"
        >
          ✕ Close
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Camera/Upload Toggle */}
        {!imageData && !useCamera && (
          <div className="flex flex-col gap-4">
            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition"
            >
              <span className="text-3xl">📷</span>
              <span className="text-slate-600">Take Photo</span>
            </button>

            <div className="text-center text-slate-400">or</div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition"
            >
              <span className="text-3xl">📁</span>
              <span className="text-slate-600">Upload File</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Camera View */}
        {useCamera && !imageData && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={capturePhoto}
                className="px-6 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700"
              >
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 border rounded-full hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {imageData && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imageData}
                alt="Receipt preview"
                className="w-full max-h-96 object-contain rounded-lg"
              />
              <button
                onClick={() => {
                  setImageData(null);
                  setFileName('');
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">File Name</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Optional notes about this receipt"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Save Receipt
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Receipt View Component
interface ReceiptViewProps {
  receipt: Receipt;
  onClose: () => void;
  onDelete: () => void;
}

function ReceiptView({ receipt, onClose, onDelete }: ReceiptViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
          ← Back to Receipts
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
        >
          🗑️ Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <img
          src={receipt.imageData}
          alt={receipt.fileName}
          className="w-full max-h-[70vh] object-contain rounded-lg"
        />

        <div className="mt-4 space-y-2">
          <p className="font-medium">{receipt.fileName}</p>
          <p className="text-sm text-slate-500">Uploaded: {formatDate(receipt.uploadDate)}</p>
          {receipt.notes && (
            <p className="text-sm text-slate-600 mt-2">{receipt.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
