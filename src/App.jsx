import { useState, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   TOKENS — off-white / charcoal editorial
═══════════════════════════════════════════ */
const C = {
  bg:"#F7F5F1", surface:"#FFFFFF", card:"#FFFFFF", cardHi:"#F1EEE7",
  border:"#E3E0D8", borderHi:"#CFCBC0",
  accent:"#2952A3", accentLo:"#1F3D7A", accentGlow:"#2952A312",
  teal:"#0F6F62", tealGlow:"#0F6F6210",
  gold:"#A6671B", goldGlow:"#A6671B10",
  green:"#1A7A4C", greenGlow:"#1A7A4C10",
  red:"#B3261E", amber:"#A6671B",
  text:"#1C1C1A", soft:"#5C5B57", dim:"#9C9890",
  grad:"linear-gradient(135deg,#2952A3,#1F3D7A)",
  gradTeal:"linear-gradient(135deg,#0F6F62,#0B5247)",
};

/* ═══════════════════════════════════════════
   CONTACT — manual review goes here
═══════════════════════════════════════════ */
const WHATSAPP_NUMBER = "5518998098771"; // 18 998098771, BR country code

/* ═══════════════════════════════════════════
   GUARANTEE TYPES
═══════════════════════════════════════════ */
const GUARANTEE_TYPES = [
  { id:"duplicatas",  label:"Duplicatas / Recebíveis", icon:"📄" },
  { id:"maquininha",  label:"Maquininha de Cartão",    icon:"💳" },
  { id:"veiculo",     label:"Veículo",                 icon:"🚗" },
  { id:"imovel",      label:"Imóvel",                  icon:"🏠" },
  { id:"equipamento", label:"Equipamento / Maquinário",icon:"⚙️" },
  { id:"aval",        label:"Aval dos Sócios",         icon:"✍️" },
  { id:"nenhuma",     label:"Ainda não sei / nenhuma",  icon:"❓" },
];

const CREDIT_PURPOSE = [
  "Capital de giro",
  "Antecipação de recebíveis",
  "Compra de equipamentos / máquinas",
  "Expansão / abertura de filial",
  "Reforma ou construção",
  "Pagamento de fornecedores",
  "Outro",
];

/* ═══════════════════════════════════════════
   BRASILAPI — used only to fetch real public CNPJ data
   (razão social, CNAE, data de abertura). No score, no approval %.
═══════════════════════════════════════════ */
async function fetchCNPJ(cnpj){
  let r;
  try{
    r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj.replace(/\D/g,"")}`);
  }catch(networkErr){
    const e = new Error("Consulta automática indisponível neste ambiente de preview — funciona normalmente ao hospedar o site (Vercel, Netlify, GitHub Pages etc.)");
    e.isNetworkBlock = true;
    throw e;
  }
  if(!r.ok) throw new Error(`CNPJ não localizado na Receita Federal (HTTP ${r.status})`);
  return r.json();
}
function parseApi(d){
  const open=d.data_inicio_atividade||"";
  let foundedLabel="";
  if(open){
    const parts = open.includes("-") ? open.split("-") : open.split("/").reverse();
    const [yy,mm,dd] = parts;
    if(yy&&mm&&dd) foundedLabel = `${dd}/${mm}/${yy}`;
  }
  return {
    name: d.razao_social || "",
    cnae: d.cnae_fiscal_descricao || "",
    founded: foundedLabel,
    status: (d.descricao_situacao_cadastral||"").toUpperCase(),
    city: d.municipio||"", uf: d.uf||"",
  };
}

/* ═══════════════════════════════════════════
   FORMATTERS
═══════════════════════════════════════════ */
const fmtCNPJ = v=>v.replace(/\D/g,"").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,"$1.$2.$3/$4-$5");
const fmtCurrInput = v=>{
  const n = v.replace(/\D/g,"");
  if(!n) return "";
  return (parseInt(n,10)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
};
const parseCurrInput = v=>{
  const n = v.replace(/\D/g,"");
  return n ? parseInt(n,10)/100 : 0;
};
const fmtBRL = v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

/* ═══════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════ */
function Tag({children,color}){
  return <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.06em",padding:"3px 9px",borderRadius:4,background:`${color}14`,color,border:`1px solid ${color}30`,textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
}
function Dot({color=C.accent,size=7}){
  return <span style={{position:"relative",display:"inline-block",width:size,height:size}}>
    <span style={{position:"absolute",inset:0,borderRadius:"50%",background:color,animation:"cbPulse 2s ease-out infinite"}}/>
    <span style={{position:"absolute",inset:0,borderRadius:"50%",background:color}}/>
  </span>;
}
function FieldLabel({children,required,error}){
  return <label style={{fontSize:12,fontWeight:600,color:error?C.red:C.text,marginBottom:6,display:"block"}}>
    {children}{required && <span style={{color:C.red}}> *</span>}
  </label>;
}
function HelpText({children}){
  return <div style={{fontSize:11,color:C.dim,marginTop:5,lineHeight:1.5}}>{children}</div>;
}
function ErrorText({children}){
  return <div style={{fontSize:11,color:C.red,marginTop:5}}>{children}</div>;
}

const inputBase = {
  width:"100%", padding:"12px 14px", background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:9, color:C.text, fontSize:14, fontFamily:"'Inter',sans-serif", outline:"none",
  transition:"border-color 0.15s",
};

function TextInput({value,onChange,placeholder,error,type="text",...rest}){
  return <input
    type={type} value={value} placeholder={placeholder}
    onChange={e=>onChange(e.target.value)}
    style={{...inputBase, border:`1px solid ${error?C.red:C.border}`}}
    {...rest}
  />;
}

function Select({value,onChange,options,error}){
  return <select value={value} onChange={e=>onChange(e.target.value)} style={{...inputBase, border:`1px solid ${error?C.red:C.border}`}}>
    <option value="">Selecione…</option>
    {options.map(o=> typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

/* File upload field — stores File object in memory (browser-only, no backend) */
function FileUpload({label,required,value,onChange,error,hint,accept="image/*,application/pdf"}){
  const inputRef = useRef(null);
  return <div>
    <FieldLabel required={required} error={error}>{label}</FieldLabel>
    <div
      onClick={()=>inputRef.current?.click()}
      style={{
        border:`1.5px dashed ${error?C.red:value?C.teal:C.border}`,
        borderRadius:10, padding:"16px 18px", cursor:"pointer",
        background:value?C.tealGlow:C.surface, display:"flex", alignItems:"center", gap:12,
        transition:"border-color 0.15s",
      }}
    >
      <span style={{fontSize:20,flexShrink:0}}>{value ? "✅" : "📎"}</span>
      <div style={{flex:1,minWidth:0}}>
        {value ? (
          <>
            <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value.name}</div>
            <div style={{fontSize:11,color:C.dim}}>{(value.size/1024).toFixed(0)} KB · clique para substituir</div>
          </>
        ) : (
          <>
            <div style={{fontSize:13,fontWeight:600,color:C.soft}}>Toque para selecionar um arquivo</div>
            <div style={{fontSize:11,color:C.dim}}>{hint || "PDF, JPG ou PNG"}</div>
          </>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={(e)=>{ e.stopPropagation(); onChange(null); }}
          style={{background:"transparent",border:"none",color:C.dim,fontSize:18,cursor:"pointer",padding:4,flexShrink:0}}
        >✕</button>
      )}
    </div>
    <input
      ref={inputRef} type="file" accept={accept} style={{display:"none"}}
      onChange={e=>{ const f=e.target.files?.[0]; if(f) onChange(f); }}
    />
    {error && <ErrorText>{error}</ErrorText>}
  </div>;
}

/* ═══════════════════════════════════════════
   LOADING (CNPJ lookup only — no scoring claims)
═══════════════════════════════════════════ */
function CNPJLoading({cnpj}){
  const [step,setStep]=useState(0);
  const steps=["Consultando CNPJ na Receita Federal…","Verificando situação cadastral…","Carregando dados públicos da empresa…"];
  useState(()=>{ const t=setInterval(()=>setStep(s=>s<steps.length-1?s+1:s),550); return()=>clearInterval(t); });
  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,gap:28,fontFamily:"'Inter',sans-serif"}}>
    <div style={{position:"relative",width:64,height:64}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:`1.5px solid ${C.border}`}}/>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTopColor:C.accent,animation:"cbSpin 0.9s linear infinite"}}/>
    </div>
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"'Source Serif 4',serif",fontSize:17,fontWeight:600,color:C.text,marginBottom:8}}>{fmtCNPJ(cnpj)}</div>
      <div style={{color:C.soft,fontSize:13,minHeight:18}}>{steps[step]}</div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════
   CNPJ NOT FOUND / NETWORK BLOCK NOTICE
═══════════════════════════════════════════ */
function CNPJNotice({error,isNetworkBlock,onContinueManually,onBack}){
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,padding:"40px 5%",fontFamily:"'Inter',sans-serif",color:C.text}}>
    <div style={{maxWidth:480,width:"100%"}}>
      <div style={{padding:"14px 16px",background:isNetworkBlock?C.accentGlow:`${C.amber}0E`,border:`1px solid ${isNetworkBlock?C.accent:C.amber}30`,borderRadius:10,marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:17}}>{isNetworkBlock?"ℹ️":"⚠️"}</span>
        <div>
          <div style={{fontWeight:600,color:isNetworkBlock?C.accent:C.amber,marginBottom:3,fontSize:13}}>
            {isNetworkBlock ? "Consulta automática indisponível neste preview" : "CNPJ não localizado"}
          </div>
          <div style={{fontSize:12,color:C.soft,lineHeight:1.6}}>
            {isNetworkBlock
              ? "Este ambiente de visualização não acessa a Receita Federal. Ao hospedar o site, a busca automática funciona normalmente. Você pode preencher os dados manualmente para continuar."
              : `${error} — você pode preencher os dados manualmente para continuar a solicitação.`}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onBack} style={{flex:1,padding:12,background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,color:C.soft,cursor:"pointer",fontSize:13}}>← Voltar</button>
        <button onClick={onContinueManually} style={{flex:2,padding:12,background:C.grad,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Continuar manualmente →</button>
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════
   REQUEST FORM — the real product now
═══════════════════════════════════════════ */
function RequestForm({cnpj, prefill, onBack}){
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [f, setF] = useState({
    razaoSocial: prefill?.name || "",
    dataFundacao: prefill?.founded || "",
    cidade: prefill?.city || "",
    uf: prefill?.uf || "",
    cnae: prefill?.cnae || "",
    nomeResponsavel: "",
    telefone: "",
    email: "",
    valorSolicitado: "",
    finalidade: "",
    finalidadeOutro: "",
    garantias: [],
    faturamentoMensalAprox: "",
    observacoes: "",
  });
  const [files, setFiles] = useState({
    contratoSocial: null,
    fotoFachada: null,
    comprovanteFaturamento: null,
    fluxoCaixa: null,
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const setFile = (k,v) => setFiles(p=>({...p,[k]:v}));
  const toggleGuarantee = (id) => setF(p=>({
    ...p,
    garantias: p.garantias.includes(id) ? p.garantias.filter(g=>g!==id) : [...p.garantias, id]
  }));

  const validateStep = (s) => {
    const e = {};
    if(s===1){
      if(!f.razaoSocial.trim()) e.razaoSocial = "Informe a razão social.";
      if(!f.dataFundacao.trim()) e.dataFundacao = "Informe a data de fundação.";
    }
    if(s===2){
      if(!f.nomeResponsavel.trim()) e.nomeResponsavel = "Informe o nome do responsável.";
      if(!f.telefone.trim()) e.telefone = "Informe um telefone de contato.";
    }
    if(s===3){
      if(!f.valorSolicitado || parseCurrInput(f.valorSolicitado)<=0) e.valorSolicitado = "Informe o valor solicitado.";
      if(!f.finalidade) e.finalidade = "Selecione a finalidade do crédito.";
      if(f.garantias.length===0) e.garantias = "Selecione ao menos uma opção (ou 'ainda não sei').";
    }
    if(s===4){
      if(!files.contratoSocial) e.contratoSocial = "Anexe o contrato social.";
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const next = () => { if(validateStep(step)) setStep(s=>Math.min(s+1,totalSteps)); };
  const back = () => setStep(s=>Math.max(s-1,1));

  const buildWhatsAppMessage = () => {
    const lines = [
      "*Nova solicitação de crédito — CréditoBI*",
      "",
      `*Empresa:* ${f.razaoSocial}`,
      `*CNPJ:* ${fmtCNPJ(cnpj)}`,
      `*Fundação:* ${f.dataFundacao}`,
      f.cidade ? `*Cidade:* ${f.cidade}${f.uf?" - "+f.uf:""}` : null,
      f.cnae ? `*Atividade:* ${f.cnae}` : null,
      "",
      `*Responsável:* ${f.nomeResponsavel}`,
      `*Telefone:* ${f.telefone}`,
      f.email ? `*E-mail:* ${f.email}` : null,
      "",
      `*Valor solicitado:* ${fmtBRL(parseCurrInput(f.valorSolicitado))}`,
      `*Finalidade:* ${f.finalidade==="Outro" ? f.finalidadeOutro : f.finalidade}`,
      `*Garantias oferecidas:* ${f.garantias.map(id=>GUARANTEE_TYPES.find(g=>g.id===id)?.label).join(", ")}`,
      f.faturamentoMensalAprox ? `*Faturamento mensal aprox.:* ${fmtBRL(parseCurrInput(f.faturamentoMensalAprox))}` : null,
      f.observacoes ? `\n*Observações:* ${f.observacoes}` : null,
      "",
      "*Documentos anexados no formulário:*",
      `- Contrato Social: ${files.contratoSocial ? "✅ " + files.contratoSocial.name : "❌ não enviado"}`,
      `- Foto da empresa: ${files.fotoFachada ? "✅ " + files.fotoFachada.name : "❌ não enviado"}`,
      `- Comprovante de faturamento: ${files.comprovanteFaturamento ? "✅ " + files.comprovanteFaturamento.name : "❌ não enviado"}`,
      `- Fluxo de caixa: ${files.fluxoCaixa ? "✅ " + files.fluxoCaixa.name : "❌ não enviado"}`,
      "",
      "_Os arquivos anexados no site precisam ser reenviados aqui pelo WhatsApp, pois o formulário não os transmite automaticamente._",
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleSubmit = () => {
    if(!validateStep(4)) return;
    setSubmitted(true);
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(buildWhatsAppMessage());
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  if(submitted){
    return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,padding:"40px 5%",fontFamily:"'Inter',sans-serif",color:C.text}}>
      <div style={{maxWidth:520,width:"100%",textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:14,background:C.greenGlow,border:`1px solid ${C.green}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 20px"}}>✓</div>
        <h2 style={{fontFamily:"'Source Serif 4',serif",fontWeight:700,fontSize:24,marginBottom:10}}>Solicitação pronta para envio</h2>
        <p style={{fontSize:14,color:C.soft,lineHeight:1.7,marginBottom:8,maxWidth:440,margin:"0 auto 24px"}}>
          Sua solicitação para <b style={{color:C.text}}>{f.razaoSocial}</b> foi organizada. Nossa equipe faz a análise manualmente e retorna pelo WhatsApp.
        </p>
        <div style={{padding:"16px 18px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:22,textAlign:"left"}}>
          <div style={{fontSize:11,color:C.dim,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>Resumo</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.8}}>
            Valor solicitado: <b>{fmtBRL(parseCurrInput(f.valorSolicitado))}</b><br/>
            Finalidade: <b>{f.finalidade==="Outro"?f.finalidadeOutro:f.finalidade}</b><br/>
            Garantias: <b>{f.garantias.map(id=>GUARANTEE_TYPES.find(g=>g.id===id)?.label).join(", ")}</b>
          </div>
        </div>
        <button onClick={openWhatsApp} style={{width:"100%",padding:"14px",background:C.gradTeal,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{fontSize:16}}>📲</span> Enviar pelo WhatsApp →
        </button>
        <p style={{fontSize:11,color:C.dim,lineHeight:1.6}}>
          Ao clicar, abriremos o WhatsApp com um resumo da sua solicitação já preenchido.<br/>
          <b>Importante:</b> reenvie os documentos anexados (contrato social, fotos, comprovantes) diretamente na conversa, pois o formulário não os transmite automaticamente.
        </p>
      </div>
    </div>;
  }

  const stepTitles = ["Dados da Empresa","Responsável","Solicitação de Crédito","Documentos"];

  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",color:C.text,padding:"32px 5% 60px"}}>
    <div style={{maxWidth:560,margin:"0 auto"}}>

      {/* header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.soft,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>← Voltar</button>
        <span style={{fontFamily:"'Source Serif 4',serif",fontWeight:700,fontSize:16}}>Crédito<span style={{color:C.accent}}>BI</span></span>
      </div>

      {/* progress */}
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600,color:C.text}}>{stepTitles[step-1]}</span>
          <span style={{fontSize:12,color:C.dim}}>Etapa {step} de {totalSteps}</span>
        </div>
        <div style={{height:4,background:C.border,borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/totalSteps)*100}%`,background:C.grad,borderRadius:99,transition:"width 0.3s"}}/>
        </div>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"28px 26px"}}>

        {/* STEP 1 — Company data */}
        {step===1 && <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:"10px 13px",background:C.accentGlow,border:`1px solid ${C.accent}25`,borderRadius:9,fontSize:12,color:C.accent,fontFamily:"'JetBrains Mono',monospace"}}>
            CNPJ: {fmtCNPJ(cnpj)}
          </div>
          <div>
            <FieldLabel required error={errors.razaoSocial}>Razão Social</FieldLabel>
            <TextInput value={f.razaoSocial} onChange={v=>set("razaoSocial",v)} placeholder="Ex: Comercial Silva LTDA" error={errors.razaoSocial}/>
            {errors.razaoSocial && <ErrorText>{errors.razaoSocial}</ErrorText>}
          </div>
          <div>
            <FieldLabel required error={errors.dataFundacao}>Data de Fundação</FieldLabel>
            <TextInput value={f.dataFundacao} onChange={v=>set("dataFundacao",v)} placeholder="DD/MM/AAAA" error={errors.dataFundacao}/>
            {errors.dataFundacao && <ErrorText>{errors.dataFundacao}</ErrorText>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
            <div>
              <FieldLabel>Cidade</FieldLabel>
              <TextInput value={f.cidade} onChange={v=>set("cidade",v)} placeholder="Ex: Presidente Prudente"/>
            </div>
            <div>
              <FieldLabel>UF</FieldLabel>
              <TextInput value={f.uf} onChange={v=>set("uf",v.toUpperCase().slice(0,2))} placeholder="SP"/>
            </div>
          </div>
          <div>
            <FieldLabel>Ramo de Atividade (CNAE)</FieldLabel>
            <TextInput value={f.cnae} onChange={v=>set("cnae",v)} placeholder="Ex: Comércio varejista de roupas"/>
          </div>
        </div>}

        {/* STEP 2 — Responsible contact */}
        {step===2 && <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <FieldLabel required error={errors.nomeResponsavel}>Nome do Responsável</FieldLabel>
            <TextInput value={f.nomeResponsavel} onChange={v=>set("nomeResponsavel",v)} placeholder="Quem vamos falar com" error={errors.nomeResponsavel}/>
            {errors.nomeResponsavel && <ErrorText>{errors.nomeResponsavel}</ErrorText>}
          </div>
          <div>
            <FieldLabel required error={errors.telefone}>Telefone / WhatsApp</FieldLabel>
            <TextInput value={f.telefone} onChange={v=>set("telefone",v)} placeholder="(18) 99999-9999" error={errors.telefone}/>
            {errors.telefone && <ErrorText>{errors.telefone}</ErrorText>}
          </div>
          <div>
            <FieldLabel>E-mail</FieldLabel>
            <TextInput value={f.email} onChange={v=>set("email",v)} placeholder="contato@empresa.com.br" type="email"/>
          </div>
        </div>}

        {/* STEP 3 — Credit request */}
        {step===3 && <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <FieldLabel required error={errors.valorSolicitado}>Valor Solicitado</FieldLabel>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.soft}}>R$</span>
              <input
                value={f.valorSolicitado}
                onChange={e=>set("valorSolicitado", fmtCurrInput(e.target.value))}
                placeholder="0,00"
                style={{...inputBase, paddingLeft:34, border:`1px solid ${errors.valorSolicitado?C.red:C.border}`}}
              />
            </div>
            {errors.valorSolicitado && <ErrorText>{errors.valorSolicitado}</ErrorText>}
          </div>
          <div>
            <FieldLabel required error={errors.finalidade}>Finalidade do Crédito</FieldLabel>
            <Select value={f.finalidade} onChange={v=>set("finalidade",v)} options={CREDIT_PURPOSE} error={errors.finalidade}/>
            {f.finalidade==="Outro" && (
              <div style={{marginTop:8}}>
                <TextInput value={f.finalidadeOutro} onChange={v=>set("finalidadeOutro",v)} placeholder="Descreva a finalidade"/>
              </div>
            )}
            {errors.finalidade && <ErrorText>{errors.finalidade}</ErrorText>}
          </div>
          <div>
            <FieldLabel required error={errors.garantias}>Garantias Disponíveis</FieldLabel>
            <HelpText>Selecione todas as opções que sua empresa pode oferecer como garantia.</HelpText>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
              {GUARANTEE_TYPES.map(g=>{
                const active = f.garantias.includes(g.id);
                return <button
                  key={g.id} type="button" onClick={()=>toggleGuarantee(g.id)}
                  style={{
                    display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
                    background:active?C.accentGlow:C.surface,
                    border:`1.5px solid ${active?C.accent:C.border}`,
                    borderRadius:9,cursor:"pointer",textAlign:"left",
                  }}
                >
                  <span style={{fontSize:15}}>{g.icon}</span>
                  <span style={{fontSize:12,fontWeight:active?600:400,color:active?C.accent:C.text}}>{g.label}</span>
                </button>;
              })}
            </div>
            {errors.garantias && <ErrorText>{errors.garantias}</ErrorText>}
          </div>
          <div>
            <FieldLabel>Faturamento Mensal Aproximado</FieldLabel>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.soft}}>R$</span>
              <input
                value={f.faturamentoMensalAprox}
                onChange={e=>set("faturamentoMensalAprox", fmtCurrInput(e.target.value))}
                placeholder="0,00"
                style={{...inputBase, paddingLeft:34}}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Observações</FieldLabel>
            <textarea
              value={f.observacoes} onChange={e=>set("observacoes",e.target.value)}
              placeholder="Algo importante que devemos saber sobre a solicitação?"
              rows={3}
              style={{...inputBase, resize:"vertical", fontFamily:"'Inter',sans-serif"}}
            />
          </div>
        </div>}

        {/* STEP 4 — Documents */}
        {step===4 && <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <div style={{padding:"12px 14px",background:C.cardHi,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12,color:C.soft,lineHeight:1.6}}>
            Esses documentos são usados pela nossa equipe para a análise manual de crédito. Quanto mais completos, mais rápida a resposta.
          </div>
          <FileUpload
            label="Contrato Social" required
            value={files.contratoSocial} onChange={v=>setFile("contratoSocial",v)}
            error={errors.contratoSocial}
            hint="Última alteração contratual consolidada, se houver"
          />
          <FileUpload
            label="Foto da Empresa"
            value={files.fotoFachada} onChange={v=>setFile("fotoFachada",v)}
            hint="Fachada, loja ou ponto comercial"
          />
          <FileUpload
            label="Comprovante de Faturamento"
            value={files.comprovanteFaturamento} onChange={v=>setFile("comprovanteFaturamento",v)}
            hint="Extrato bancário, relatório de vendas ou notas fiscais"
          />
          <FileUpload
            label="Fluxo de Caixa"
            value={files.fluxoCaixa} onChange={v=>setFile("fluxoCaixa",v)}
            hint="Planilha ou relatório, se a empresa tiver"
          />
        </div>}

        {/* nav buttons */}
        <div style={{display:"flex",gap:10,marginTop:28}}>
          {step>1 && (
            <button onClick={back} style={{flex:1,padding:13,background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,color:C.soft,cursor:"pointer",fontSize:14}}>
              ← Voltar
            </button>
          )}
          {step<totalSteps ? (
            <button onClick={next} style={{flex:2,padding:13,background:C.grad,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Continuar →
            </button>
          ) : (
            <button onClick={handleSubmit} style={{flex:2,padding:13,background:C.gradTeal,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Finalizar Solicitação →
            </button>
          )}
        </div>
      </div>

      <p style={{fontSize:11,color:C.dim,textAlign:"center",marginTop:16,lineHeight:1.6}}>
        Esta solicitação passa por análise manual da nossa equipe.<br/>Nenhuma aprovação é automática ou garantida.
      </p>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════
   HOME
═══════════════════════════════════════════ */
function Home({onConsult}){
  const [val,setVal]=useState("");
  const [touched,setTouched]=useState(false);
  const invalid = touched && val.replace(/\D/g,"").length<14;
  const go=()=>{
    setTouched(true);
    const c=val.replace(/\D/g,"");
    if(c.length<14) return;
    onConsult(c);
  };

  return <div style={{fontFamily:"'Inter',sans-serif",background:C.bg,color:C.text,minHeight:"100vh",overflowX:"hidden"}}>

    {/* NAV */}
    <nav style={{position:"fixed",inset:"0 0 auto",zIndex:100,height:60,padding:"0 6%",display:"flex",alignItems:"center",justifyContent:"space-between",background:`${C.bg}F0`,backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:7,background:C.grad,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:13,fontWeight:800,color:"#fff",fontFamily:"'Source Serif 4',serif"}}>C</span>
        </div>
        <span style={{fontFamily:"'Source Serif 4',serif",fontWeight:700,fontSize:16}}>Crédito<span style={{color:C.accent}}>BI</span></span>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:11,color:C.soft}}>Análise feita por especialistas</span>
      </div>
    </nav>

    {/* HERO */}
    <section style={{minHeight:"92vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"100px 6% 60px",position:"relative"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(${C.border} 1px,transparent 1px)`,backgroundSize:"44px 44px",opacity:0.3,pointerEvents:"none"}}/>

      <div style={{position:"relative",textAlign:"center",maxWidth:760,animation:"cbUp 0.8s ease both"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:99,border:`1px solid ${C.accent}25`,background:C.accentGlow,marginBottom:26}}>
          <Dot/><span style={{fontSize:11,color:C.accent,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em"}}>FIDCs · Fundos de Crédito Independentes</span>
        </div>

        <h1 style={{fontFamily:"'Source Serif 4',serif",fontSize:"clamp(32px,4.8vw,54px)",fontWeight:700,lineHeight:1.15,letterSpacing:"-0.01em",marginBottom:18,color:C.text}}>
          Solicite crédito para sua empresa<br/>com análise feita por especialistas
        </h1>

        <p style={{fontSize:15,color:C.soft,lineHeight:1.8,margin:"0 auto 38px",maxWidth:540}}>
          Preencha os dados da sua empresa e envie os documentos. Nossa equipe analisa manualmente
          e encontra o fundo de crédito (FIDC) mais adequado ao seu perfil — sem promessas automáticas, sem simulação.
        </p>

        <div style={{maxWidth:480,margin:"0 auto"}}>
          <div style={{display:"flex",borderRadius:12,overflow:"hidden",boxShadow:`0 0 0 1px ${invalid?C.red:C.border}`}}>
            <input
              value={fmtCNPJ(val)}
              onChange={e=>setVal(e.target.value.replace(/\D/g,"").slice(0,14))}
              onKeyDown={e=>e.key==="Enter"&&go()}
              placeholder="00.000.000/0000-00"
              style={{flex:1,padding:"16px 18px",background:C.surface,border:"none",color:C.text,fontSize:15,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",outline:"none"}}
            />
            <button onClick={go} style={{padding:"16px 22px",background:C.grad,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>
              Iniciar Solicitação →
            </button>
          </div>
          {invalid && <div style={{marginTop:8,fontSize:12,color:C.red}}>Digite um CNPJ válido com 14 dígitos.</div>}
        </div>
        <p style={{marginTop:14,fontSize:11,color:C.dim}}>Análise 100% manual · Sem aprovação automática · LGPD</p>
      </div>
    </section>

    {/* HOW IT WORKS — honest, manual process */}
    <section style={{padding:"64px 6%",borderTop:`1px solid ${C.border}`}}>
      <div style={{maxWidth:1000,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{fontSize:11,color:C.accent,fontFamily:"'JetBrains Mono',monospace",marginBottom:10,letterSpacing:"0.08em",textTransform:"uppercase"}}>Como funciona</div>
          <h2 style={{fontFamily:"'Source Serif 4',serif",fontSize:"clamp(24px,3vw,32px)",fontWeight:700}}>Um processo real, sem promessas automáticas</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18}}>
          {[
            {n:"1",t:"Você envia a solicitação",d:"CNPJ, dados da empresa, valor desejado, garantias disponíveis e documentos básicos."},
            {n:"2",t:"Nossa equipe analisa",d:"Cada solicitação é avaliada manualmente — checamos restrições, documentação e viabilidade real."},
            {n:"3",t:"Indicamos o fundo certo",d:"Com base na análise, conectamos sua empresa ao FIDC ou fundo independente mais adequado."},
            {n:"4",t:"Você é contatado",d:"O retorno acontece por WhatsApp, com transparência sobre o que é viável para o seu caso."},
          ].map(s=>(
            <div key={s.n} style={{padding:22,background:C.surface,border:`1px solid ${C.border}`,borderRadius:13}}>
              <div style={{width:28,height:28,borderRadius:8,background:C.accentGlow,border:`1px solid ${C.accent}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.accent,marginBottom:14,fontFamily:"'Source Serif 4',serif"}}>{s.n}</div>
              <h3 style={{fontFamily:"'Source Serif 4',serif",fontSize:14,fontWeight:700,marginBottom:7}}>{s.t}</h3>
              <p style={{color:C.soft,fontSize:12.5,lineHeight:1.7}}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* WHY MANUAL — sets honest expectations */}
    <section style={{padding:"64px 6%",background:C.surface,borderTop:`1px solid ${C.border}`}}>
      <div style={{maxWidth:760,margin:"0 auto",textAlign:"center"}}>
        <h2 style={{fontFamily:"'Source Serif 4',serif",fontSize:"clamp(22px,3vw,30px)",fontWeight:700,marginBottom:16}}>Por que a análise é manual?</h2>
        <p style={{color:C.soft,lineHeight:1.85,fontSize:14,marginBottom:14}}>
          Crédito empresarial envolve restrições, documentação e particularidades que não podem ser
          reduzidas a um número gerado automaticamente. Uma empresa com pendências fiscais, protesto
          ou CNAE de risco precisa de uma avaliação real — não de uma simulação otimista.
        </p>
        <p style={{color:C.soft,lineHeight:1.85,fontSize:14}}>
          Por isso, cada solicitação que chega aqui passa por análise humana antes de qualquer
          indicação de fundo. Isso protege sua empresa de expectativas falsas e protege os fundos
          parceiros de receberem solicitações sem triagem.
        </p>
      </div>
    </section>

    <footer style={{padding:"24px 6%",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <span style={{fontFamily:"'Source Serif 4',serif",fontWeight:700,fontSize:13}}>Crédito<span style={{color:C.accent}}>BI</span></span>
      <span style={{fontSize:11,color:C.dim}}>© 2025 CréditoBI · Análise manual · LGPD</span>
    </footer>
  </div>;
}

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
export default function App(){
  const [view,setView]=useState("home"); // home | loading | notice | form
  const [cnpj,setCnpj]=useState("");
  const [err,setErr]=useState("");
  const [isNetBlock,setIsNetBlock]=useState(false);
  const [prefill,setPrefill]=useState(null);

  const consult=useCallback(async raw=>{
    setCnpj(raw); setView("loading");
    try{
      const data=await fetchCNPJ(raw);
      const parsed=parseApi(data);
      await new Promise(r=>setTimeout(r,900));
      setPrefill(parsed);
      setView("form");
    }catch(e){
      await new Promise(r=>setTimeout(r,600));
      setErr(e.message||"Erro desconhecido");
      setIsNetBlock(!!e.isNetworkBlock);
      setView("notice");
    }
  },[]);

  const continueManually = () => { setPrefill(null); setView("form"); };
  const back = () => { setView("home"); setCnpj(""); setErr(""); setIsNetBlock(false); setPrefill(null); };

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body{background:#F7F5F1;}
      @keyframes cbSpin{to{transform:rotate(360deg)}}
      @keyframes cbPulse{0%,100%{transform:scale(1);opacity:1}60%{transform:scale(2.6);opacity:0}}
      @keyframes cbUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      input::placeholder,textarea::placeholder{color:#9C9890;}
      input:focus,select:focus,textarea:focus{outline:none;border-color:#2952A3!important;box-shadow:0 0 0 3px #2952A312;}
      select option{background:#FFFFFF;color:#1C1C1A;}
      ::-webkit-scrollbar{width:4px;height:4px;}
      ::-webkit-scrollbar-track{background:#F1EEE7;}
      ::-webkit-scrollbar-thumb{background:#CFCBC0;border-radius:99px;}
      a{color:inherit;}
    `}</style>
    {view==="home"    && <Home onConsult={consult}/>}
    {view==="loading" && <CNPJLoading cnpj={cnpj}/>}
    {view==="notice"  && <CNPJNotice error={err} isNetworkBlock={isNetBlock} onContinueManually={continueManually} onBack={back}/>}
    {view==="form"    && <RequestForm cnpj={cnpj} prefill={prefill} onBack={back}/>}
  </>;
}
