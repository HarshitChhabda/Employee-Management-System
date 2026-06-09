const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src/pages/Letters.tsx');
let code = fs.readFileSync(targetPath, 'utf-8');

// Imports
code = code.replace(
  `CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, Upload, File as FileIcon, XCircle, Pin, Eye, Archive, Download, Send, RefreshCw, Paperclip`,
  `CheckCircle, AlertCircle, ArrowUpRight, ArrowDownLeft, Upload, File as FileIcon, XCircle, Pin, Eye, Archive, Download, Send, RefreshCw, Paperclip, Loader2`
);
code = code.replace(
  `import { useLanguage } from '../lib/LanguageContext';`,
  `import { useLanguage } from '../lib/LanguageContext';\nimport { useConnectivity } from '../lib/ConnectivityContext';`
);

// State vars
code = code.replace(
  `const [selectedFile, setSelectedFile] = useState<File | null>(null);`,
  `const [selectedFile, setSelectedFile] = useState<File | null>(null);\n  const [filePreview, setFilePreview] = useState<string | null>(null);\n  const [fileUploadStatus, setFileUploadStatus] = useState<'idle' | 'uploading' | 'local_only' | 'synced' | 'error'>('idle');\n  const [previewData, setPreviewData] = useState<string | null>(null);\n  const [previewLoading, setPreviewLoading] = useState(false);`
);

// isOnline
code = code.replace(
  `const { handleExport, isExporting } = useExport();`,
  `const { handleExport, isExporting } = useExport();\n  const { isOnline } = useConnectivity();`
);

// useEffect for connectivity
code = code.replace(
  `  useEffect(() => {
    if (activeTab === 'notice') {`,
  `  useEffect(() => {
    if (isOnline) {
      letterAPI.retryPendingUploads().then((result: any) => {
        if (result?.retried > 0) {
          showToast(\`\${result.retried} files cloud sync हुईं\`, 'success');
          fetchLetters();
        }
      }).catch(() => {});
    }
  }, [isOnline]);

  useEffect(() => {
    if (activeTab === 'notice') {`
);

// Load preview when letter selected
code = code.replace(
  `  useEffect(() => {
    if (activeTab === 'audit' && selectedLetter) {`,
  `  useEffect(() => {
    if (selectedLetter?.file_local_path || selectedLetter?.file_url) {
      setPreviewLoading(true);
      letterAPI.readFile(
        selectedLetter.file_url,
        selectedLetter.file_local_path
      ).then((res: any) => {
        setPreviewData(res.file_data);
      }).catch(() => {
        setPreviewData(null);
      }).finally(() => setPreviewLoading(false));
    } else {
      setPreviewData(null);
    }
  }, [selectedLetter?.id]);

  useEffect(() => {
    if (activeTab === 'audit' && selectedLetter) {`
);

// File Handler
code = code.replace(
  `  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be under 10MB', 'error');
        return;
      }
      setSelectedFile(file);
      setFormData({ ...formData, file_name: file.name });
    }
  };`,
  `  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      showToast('फ़ाइल बहुत बड़ी है (Max 10MB allowed)', 'error');
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      showToast('Invalid file type. Only PDF, JPG, PNG allowed', 'error');
      return;
    }
    setSelectedFile(file);
    setFormData({ ...formData, file_name: file.name });
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };`
);

// Handle Submit
code = code.replace(
  `      if (selectedFile && letterId) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await letterAPI.saveFile(letterId, base64, selectedFile.name);
          } catch (fileErr) {
            console.error('File upload err:', fileErr);
            showToast('Failed to upload attachment', 'error');
          }
        };
      }`,
  `      if (selectedFile && letterId) {
        setFileUploadStatus('uploading');
        try {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
              const result = await letterAPI.saveFile(
                letterId,
                base64,
                selectedFile.name,
                selectedFile.type
              );
              setFileUploadStatus(result.storage === 'both' ? 'synced' : 'local_only');
              if (result.storage === 'local_only') {
                showToast('फ़ाइल locally saved. Internet connection pe cloud sync होगी', 'warning');
              } else {
                showToast('फ़ाइल upload successful (Local + Cloud)', 'success');
              }
            } catch (fileErr: any) {
              setFileUploadStatus('error');
              showToast(fileErr.message || 'File upload failed', 'error');
            }
          };
        } catch (fileErr: any) {
          setFileUploadStatus('error');
          showToast(fileErr.message || 'File read failed', 'error');
        }
      }`
);

// Drag drop zone JSX
code = code.replace(
  `            <div className="border-2 border-dashed border-[var(--border-primary)] rounded-xl p-6 flex flex-col items-center justify-center hover:bg-[var(--bg-secondary)]/50 transition-colors relative">
               <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
               {selectedFile || formData.file_name ? (
                 <div className="flex flex-col items-center gap-2 text-blue-500">
                    <FileIcon size={32} />
                    <span className="font-medium text-sm text-[var(--text-primary)] text-center break-all px-4">{selectedFile ? selectedFile.name : formData.file_name}</span>
                    {selectedFile && <span className="text-xs text-[var(--text-secondary)]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                    <Upload size={32} className="opacity-50" />
                    <span className="font-medium">Drag & Drop or Click to Upload</span>
                    <span className="text-xs opacity-70">Max 10MB (PDF, JPG, PNG)</span>
                 </div>
               )}
            </div>`,
  `            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
              }}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative",
                selectedFile
                  ? "border-blue-500/40 bg-blue-500/5"
                  : "border-[var(--border-primary)] hover:border-blue-500/30 hover:bg-blue-500/5"
              )}
              onClick={() => document.getElementById('letter-file-input')?.click()}
            >
              <input
                id="letter-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  {filePreview && selectedFile.type.startsWith('image/') ? (
                    <img src={filePreview} className="max-h-32 rounded-lg object-contain" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <FileIcon className="w-6 h-6 text-blue-500" />
                    </div>
                  )}
                  <p className="text-xs font-black text-[var(--text-primary)]">{selectedFile.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFilePreview(null); }}
                    className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider"
                  >
                    ✕ Remove File
                  </button>
                </div>
              ) : formData.file_name ? (
                <div className="flex flex-col items-center gap-2 text-blue-500">
                    <FileIcon size={32} />
                    <span className="font-medium text-sm text-[var(--text-primary)] text-center break-all px-4">{formData.file_name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                  <Upload className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-black">
                    फ़ाइल यहाँ खींचें या क्लिक करें
                  </p>
                  <p className="text-[10px] opacity-60">PDF, JPG, PNG — Max 10MB</p>
                </div>
              )}
            </div>
            
            {fileUploadStatus !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider mt-2",
                fileUploadStatus === 'uploading'  && "bg-blue-500/10 text-blue-400",
                fileUploadStatus === 'synced'     && "bg-green-500/10 text-green-400",
                fileUploadStatus === 'local_only' && "bg-amber-500/10 text-amber-400",
                fileUploadStatus === 'error'      && "bg-red-500/10 text-red-400"
              )}>
                {fileUploadStatus === 'uploading'  && <><Loader2 size={10} className="animate-spin" /> Uploading...</>}
                {fileUploadStatus === 'synced'     && <><CheckCircle size={10} /> Local + Cloud Saved</>}
                {fileUploadStatus === 'local_only' && <><AlertCircle size={10} /> Local Only — Pending Cloud Sync</>}
                {fileUploadStatus === 'error'      && <><X size={10} /> Upload Failed</>}
              </div>
            )}`
);

// Preview JSX in sidebar
code = code.replace(
  `                  {/* Attachment Preview Button */}
                  {selectedLetter.file_name && (
                    <div className="border border-[var(--border-primary)] rounded-xl p-4 flex items-center justify-between bg-[var(--bg-secondary)]/30 mt-6">
                       <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <FileIcon size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{selectedLetter.file_name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase">Attachment</p>
                          </div>
                       </div>
                    </div>
                  )}`,
  `                  {/* Sidebar Attachment Preview */}
                  {(selectedLetter?.file_name || selectedLetter?.file_url || selectedLetter?.file_local_path) && (
                    <div className="border-t border-[var(--border-primary)] pt-5 mt-6 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                        संलग्न फ़ाइल / Attached File
                      </span>
                  
                      {previewLoading ? (
                        <div className="h-32 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
                      ) : previewData ? (
                        <div className="space-y-2">
                          {selectedLetter.file_name?.match(/\\.(jpg|jpeg|png)$/i) ? (
                            <img
                              src={\`data:image/*;base64,\${previewData}\`}
                              className="w-full max-h-48 object-contain rounded-xl border border-[var(--border-primary)]"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]">
                              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 shrink-0">
                                <FileIcon className="w-5 h-5 text-red-400" />
                              </div>
                              <div className="flex-grow min-w-0">
                                <p className="text-xs font-black text-[var(--text-primary)] truncate">
                                  {selectedLetter.file_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {selectedLetter.file_url && (
                                    <span className="text-[8px] font-black text-green-400 uppercase">
                                      ☁ Cloud Synced
                                    </span>
                                  )}
                                  {selectedLetter.file_local_path && (
                                    <span className="text-[8px] font-black text-blue-400 uppercase">
                                      💾 Local
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                  
                          <div className="flex gap-2">
                            {selectedLetter.file_url && (
                              <a
                                href={selectedLetter.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider hover:bg-blue-500/20 transition-colors"
                              >
                                <ExternalLink size={10} />
                                Cloud View
                              </a>
                            )}
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                const type = selectedLetter.file_name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
                                link.href = \`data:\${type};base64,\${previewData}\`;
                                link.download = selectedLetter.file_name || 'letter-file';
                                link.click();
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-colors"
                            >
                              <Download size={10} />
                              Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[var(--text-secondary)] font-bold italic">
                          No file attached or unable to load preview
                        </p>
                      )}
                    </div>
                  )}`
);

fs.writeFileSync(targetPath, code);
console.log('Applied frontend changes');
