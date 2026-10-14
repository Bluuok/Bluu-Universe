export const ProjectRegistry = {
  threadcove: { id:'threadcove', name:'ThreadCove', category:'研究桌 / AI 工具', summary:'把 AI 对话、模型和工具串成一条清晰的工作线索。', details:['项目介绍正在依据本地 README 核实。'], links:[{label:'查看 GitHub',url:'https://github.com/Bluuok/ThreadCove'}], image:null, exhibit:'leftMonitor' },
  clawtide: { id:'clawtide', name:'Clawtide', category:'调度台 / 工作流', summary:'让工具协作与任务调度，有一个看得见的工作台。', details:['项目介绍正在依据本地 README 核实。'], links:[{label:'查看 GitHub',url:'https://github.com/Bluuok/Clawtide'}], image:null, exhibit:'rightMonitor' },
  contributions: { id:'contributions', name:'Folio & DeerFlow', category:'贡献板 / 开源参与', summary:'从理解代码开始，在真实项目中记录学习与贡献。', details:['具体贡献与个人身份尚待配置；这里保留真实项目入口。'], links:[{label:'DeerFlow 原项目',url:'https://github.com/bytedance/deer-flow'}], image:null, exhibit:'whiteboard' },
  contact: { id:'contact', name:'关于我', category:'名片 / 简历与联系', summary:'很高兴在星海里与你相遇。', details:['姓名、经历、简历与联系方式尚未提供，可在 ProjectRegistry 中配置。'], links:[], image:null, exhibit:'contactCard' }
};

export async function loadProjectContent() {
  let notes;
  try {
    const response = await fetch('/content-notes.json');
    if (!response.ok) return {loaded:false,error:'HTTP '+response.status};
    notes = await response.json();
    if (!notes || typeof notes !== 'object') throw new Error('项目资料格式无效');
  } catch (error) {
    console.warn('项目资料未能载入，保留基本项目入口。',error);
    return {loaded:false,error:error.message};
  }
  const records = Array.isArray(notes.projects) ? notes.projects : Object.values(notes.projects || notes);
  for (const record of records) {
    const id = record.id || record.key;
    if (ProjectRegistry[id]) Object.assign(ProjectRegistry[id], record, {id,category:record.exhibitLabel+' / '+(record.kind==='contribution'?'开源贡献':'独立项目'),summary:record.description||record.summary,details:[...(record.highlights||record.details||[]),record.mediaNote].filter(Boolean),image:record.media?.[0]?.src||record.image});
  }
  const folio=records.find(p=>p.id==='folio');const deerflow=records.find(p=>p.id==='deerflow');
  if(folio&&deerflow)Object.assign(ProjectRegistry.contributions,{category:'贡献板 / 开源参与',summary:'在 Folio 与 DeerFlow 的真实代码和文档中，把边界、细节与说明做扎实。',details:[...folio.contributions.filter(c=>c.status==='merged').map(c=>`Folio #${c.number} · ${c.title}（已合并）`),...deerflow.contributions.map(c=>`DeerFlow #${c.number} · ${c.title}（已合并）`),'Folio #288 跨币种风险修复仍待合并。截图为真实组件渲染，使用受控样例数据。'],links:[...folio.links.map(link=>({...link,label:link.label==='上游项目'?'Folio 上游项目':link.label})),...deerflow.links.map(link=>({...link,label:link.label==='上游项目'?'DeerFlow 上游项目':link.label}))],image:folio.media?.[0]?.src,tags:['开源贡献','代码与文档','真实 PR']});
  if(notes.person){const p=notes.person;Object.assign(ProjectRegistry.contact,{name:p.displayName||'关于我',category:'名片 / 简历与联系',summary:'很高兴在星海里与你相遇。',details:['我在这里记录作品、研究，以及对开源项目的具体贡献。',!p.email&&!p.resumeUrl?'联系方式与简历尚未配置。欢迎通过 GitHub 了解更多。':''],links:[p.github?{label:'GitHub 主页',url:p.github}:null,p.resumeUrl?{label:'查看简历',url:p.resumeUrl}:null].filter(Boolean)});}
  return {loaded:true};
}
