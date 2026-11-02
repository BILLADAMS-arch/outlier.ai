#!/usr/bin/env python3
"""Builds public/data/briefs.json from the per-category brief sources in this folder.

Each cat_*.py defines B = { 't001': dict(...), ... }. Keys:
  d  project description        bg background          pr problem / objective
  si in scope [..]              so out of scope [..]   st step-by-step [..]
  ob objectives [..]            ip inputs [(title, kind, url, note)]  kind: public | illustrative | tasker
  cd illustrative case data     dl deliverables [..] (with formats)    ac acceptance criteria [..]
  ms milestones [..]            sb submission requirements [..]        gl project guidelines [..]
  sk required subtasks [..]     wd required deliverables [(label, 'file'|'section')]
  ex extra reference links [(title, url, 'reference'|'tool')]          mw minimum words   tr target rows
Run: python3 scripts/briefs/build.py
"""
import glob, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SEED = json.load(open(os.path.join(ROOT, 'public/data/tasks.json')))
TASKS = {t['id']: t for t in SEED['tasks']}
CATEGORY_TYPE = {'software': 'code', 'web-mobile': 'code', 'design': 'design', 'marketing': 'writing', 'writing': 'writing', 'data': 'data_entry', 'virtual-assistance': 'assistant', 'customer-support': 'assistant', 'translation': 'transcription', 'video-photo': 'design', 'accounting': 'data_entry', 'research-consulting': 'research', 'ai-ml': 'research', 'education': 'writing', 'engineering': 'research', 'sales': 'assistant', 'hr': 'assistant', 'cybersecurity': 'research', 'project-management': 'assistant', 'architecture-cad': 'design'}
SECTION_KEY = {'writing': 'doc', 'data_entry': 'table', 'research': 'research', 'transcription': 'transcript', 'code': 'code', 'analysis': 'analysis', 'assistant': 'assistant'}
slug = lambda s: re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))[:40] or 'item'
REQUIRED = ['d', 'bg', 'pr', 'si', 'so', 'st', 'ob', 'ip', 'dl', 'ac', 'ms', 'sb', 'sk', 'wd']

def load():
    allb = {}
    for f in sorted(glob.glob(os.path.join(HERE, 'cat_*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        dup = set(allb) & set(m.B)
        if dup: sys.exit(f'duplicate ids {dup} in {f}')
        allb.update(m.B)
    return allb

def convert(tid, b):
    t = TASKS[tid]
    typ = CATEGORY_TYPE[t['category']]
    for k in REQUIRED:
        if not b.get(k): sys.exit(f'{tid}: missing {k}')
    if len(b['st']) < 6: sys.exit(f'{tid}: needs at least 6 steps')
    if len(b['ac']) < 4: sys.exit(f'{tid}: needs at least 4 acceptance criteria')
    for title, kind, url, note in b['ip']:
        if kind not in ('public', 'illustrative', 'tasker'): sys.exit(f'{tid}: bad input kind {kind}')
        if kind == 'public' and not url.startswith('https://'): sys.exit(f'{tid}: public input needs https link')
        if kind == 'illustrative' and not b.get('cd') and 'below' in note.lower(): sys.exit(f'{tid}: illustrative input points to case data but none given')
    wd = []
    for label, kind in b['wd']:
        if kind == 'section' and typ not in SECTION_KEY: sys.exit(f'{tid}: {typ} has no written section')
        wd.append({'id': slug(label), 'label': label, 'kind': 'file'} if kind == 'file' else {'id': slug(label), 'label': label, 'kind': 'section', 'key': SECTION_KEY[typ]})
    subs = [{'id': slug(s), 'title': s, 'required': True} for s in b['sk']]
    if len({s['id'] for s in subs}) != len(subs): sys.exit(f'{tid}: duplicate subtask ids')
    cfg = {'subtasks': subs, 'requiredDeliverables': wd, 'targetRows': b.get('tr', 0), 'minWords': b.get('mw', 0), 'allowAudioUpload': typ == 'transcription', 'submissionRequirements': b['sb']}
    return {
        'description': b['d'], 'objectives': b['ob'], 'instructions': '\n'.join(b['st']), 'guidelines': b.get('gl', []), 'deliverables': b['dl'],
        'brief': {'background': b['bg'], 'problem': b['pr'], 'scopeIn': b['si'], 'scopeOut': b['so'], 'inputs': [dict(title=i[0], kind=i[1], **({'url': i[2]} if i[2] else {}), **({'note': i[3]} if i[3] else {})) for i in b['ip']],
                  'caseData': b.get('cd', ''), 'acceptance': b['ac'], 'milestones': b['ms'], 'submission': b['sb']},
        'workspaceConfig': cfg, 'extraLinks': [{'title': a, 'url': u, 'kind': k} for a, u, k in b.get('ex', [])],
    }

def main():
    allb = load()
    out = {}
    for tid, b in allb.items():
        if tid not in TASKS: sys.exit(f'unknown task {tid}')
        out[tid] = convert(tid, b)
    # no copy-pasted instructions between projects
    seen = {}
    for tid, o in out.items():
        for line in o['instructions'].split('\n'):
            if line in seen and seen[line] != tid: sys.exit(f'step repeated in {tid} and {seen[line]}: {line[:60]}')
            seen[line] = tid
    missing = sorted(set(TASKS) - set(out))
    json.dump(out, open(os.path.join(ROOT, 'public/data/briefs.json'), 'w'), ensure_ascii=False, indent=1)
    words = sum(len(json.dumps(o).split()) for o in out.values())
    print(f'{len(out)}/{len(TASKS)} briefs written ({words} words). Missing: {len(missing)}', missing[:20] if missing else '')

main()
