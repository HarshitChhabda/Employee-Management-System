export function getLetterStatusConfig(status: string) {
  const map: Record<string, {
    label: string; labelHi: string;
    color: string; bgColor: string; borderColor: string; icon: string
  }> = {
    draft:          { label:'Draft',          labelHi:'मसौदा',         color:'text-slate-400',  bgColor:'bg-slate-500/10',  borderColor:'border-slate-500/20', icon:'FileText' },
    dispatched:     { label:'Dispatched',     labelHi:'प्रेषित',        color:'text-blue-400',   bgColor:'bg-blue-500/10',   borderColor:'border-blue-500/20',  icon:'Send' },
    in_transit:     { label:'In Transit',     labelHi:'पारगमन में',      color:'text-amber-400',  bgColor:'bg-amber-500/10',  borderColor:'border-amber-500/20', icon:'Truck' },
    received:       { label:'Received',       labelHi:'प्राप्त',         color:'text-green-400',  bgColor:'bg-green-500/10',  borderColor:'border-green-500/20', icon:'CheckCircle' },
    seen:           { label:'Seen',           labelHi:'देखा गया',        color:'text-teal-400',   bgColor:'bg-teal-500/10',   borderColor:'border-teal-500/20',  icon:'Eye' },
    pending_action: { label:'Pending Action', labelHi:'कार्रवाई लंबित',  color:'text-orange-400', bgColor:'bg-orange-500/10', borderColor:'border-orange-500/20',icon:'Clock' },
    archived:       { label:'Archived',       labelHi:'संग्रहीत',        color:'text-slate-500',  bgColor:'bg-slate-500/10',  borderColor:'border-slate-500/20', icon:'Archive' }
  }
  return map[status] || map['draft'];
}

export function getLetterPriorityConfig(priority: string) {
  const map: Record<string, { color: string; bgColor: string; labelHi: string }> = {
    normal:      { color:'text-slate-400',  bgColor:'bg-slate-500/10',  labelHi:'सामान्य' },
    urgent:      { color:'text-red-400',    bgColor:'bg-red-500/10',    labelHi:'अत्यावश्यक' },
    very_urgent: { color:'text-rose-500',   bgColor:'bg-rose-500/15',   labelHi:'अति अत्यावश्यक' }
  }
  return map[priority] || map['normal'];
}
