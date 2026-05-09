#!/usr/bin/env node
const fs = require('node:fs');
const readline = require('node:readline');

const [stdoutPath, stderrPath, donePath] = process.argv.slice(2);
if (!stdoutPath || !stderrPath || !donePath) {
  console.error('usage: curator-viewer.cjs <stdout> <stderr> <done>');
  process.exit(2);
}

function print(line = '') { process.stdout.write(line + '\n'); }
function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(textOf).filter(Boolean).join('\n');
  if (content && typeof content === 'object') return content.text || content.thinking || content.name || '';
  return '';
}
function toolNameFrom(event) {
  return event.toolName || event.toolCall?.name || event.assistantMessageEvent?.toolCall?.name || event.assistantMessageEvent?.partial?.content?.find?.((c) => c?.type === 'toolCall')?.name;
}
function summarizeJson(line) {
  let event;
  try { event = JSON.parse(line); } catch { return line.trim() ? `raw: ${line}` : ''; }
  switch (event.type) {
    case 'session': return `session ${event.id || ''} cwd=${event.cwd || ''}`;
    case 'agent_start': return 'agent_start';
    case 'agent_end': return 'agent_end';
    case 'turn_start': return 'turn_start';
    case 'turn_end': return 'turn_end';
    case 'message_start': return `message_start ${event.message?.role || ''}`.trim();
    case 'message_end': {
      const role = event.message?.role || '';
      const text = textOf(event.message?.content).trim();
      if (role === 'assistant' && text) return `assistant_final: ${text.slice(0, 2000)}`;
      if (role === 'toolResult') return `tool_result ${event.message?.toolName || ''}: ${text.slice(0, 1000)}`;
      if (role === 'user') return `user: ${text.slice(0, 1000)}`;
      return `message_end ${role}`.trim();
    }
    case 'message_update': {
      const sub = event.assistantMessageEvent?.type;
      if (sub === 'toolcall_start') return `tool_call_start ${toolNameFrom(event) || ''}`.trim();
      if (sub === 'toolcall_end') return `tool_call_end ${toolNameFrom(event) || ''}`.trim();
      if (sub === 'text_delta') return null;
      if (sub === 'text_end') return `assistant_text: ${(event.assistantMessageEvent?.content || '').slice(0, 2000)}`;
      if (sub === 'thinking_start') return 'thinking_start';
      if (sub === 'thinking_end') return 'thinking_end';
      return sub ? `message_update ${sub}` : null;
    }
    case 'tool_execution_start': return `tool_execution_start ${event.toolName || ''} ${JSON.stringify(event.args || {})}`;
    case 'tool_execution_end': {
      const text = textOf(event.result?.content).trim();
      return `tool_execution_end ${event.toolName || ''}: ${text.slice(0, 1000)}`;
    }
    default: return event.type ? `event ${event.type}` : line;
  }
}

print('# claude-mem curator live trace');
print(`# stdout: ${stdoutPath}`);
print(`# stderr: ${stderrPath}`);
print('');

let stderrPos = 0;
let stdoutPos = 0;
function pumpFile(path, label, onLine) {
  let pos = label === 'stderr' ? stderrPos : stdoutPos;
  let size = 0;
  try { size = fs.statSync(path).size; } catch { return; }
  if (size <= pos) return;
  const fd = fs.openSync(path, 'r');
  const buf = Buffer.alloc(size - pos);
  fs.readSync(fd, buf, 0, buf.length, pos);
  fs.closeSync(fd);
  if (label === 'stderr') stderrPos = size; else stdoutPos = size;
  for (const line of buf.toString('utf8').split(/\r?\n/)) {
    if (!line) continue;
    onLine(line);
  }
}

const interval = setInterval(() => {
  pumpFile(stderrPath, 'stderr', (line) => print(`stderr: ${line}`));
  pumpFile(stdoutPath, 'stdout', (line) => {
    const rendered = summarizeJson(line);
    if (rendered) print(rendered);
  });
  if (fs.existsSync(donePath)) {
    clearInterval(interval);
    pumpFile(stderrPath, 'stderr', (line) => print(`stderr: ${line}`));
    pumpFile(stdoutPath, 'stdout', (line) => {
      const rendered = summarizeJson(line);
      if (rendered) print(rendered);
    });
    print('');
    print('# claude-mem curator finished');
  }
}, 200);
