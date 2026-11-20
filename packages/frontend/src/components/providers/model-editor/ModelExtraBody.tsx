import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ExtraBodyFieldRow } from '../../ui/ExtraBodyFieldRow';
import type { ModelConfig } from './types';

interface Props {
  modelId: string;
  modelConfig: ModelConfig;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addModelKV: (modelId: string) => void;
  updateModelKV: (modelId: string, oldKey: string, newKey: string, value: any) => void;
  removeModelKV: (modelId: string, key: string) => void;
}

export function ModelExtraBody({
  modelId,
  modelConfig,
  isOpen,
  setIsOpen,
  addModelKV,
  updateModelKV,
  removeModelKV,
}: Props) {
  return (
    <div className="border-border-glass overflow-hidden rounded-md border">
      <div
        className="bg-bg-hover hover:bg-bg-glass flex cursor-pointer items-center gap-2 p-2 px-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-body text-text-secondary flex-1 text-[12px] font-medium">
          Extra Body Fields
        </span>
        <Badge status="neutral" style={{ fontSize: '10px', padding: '2px 8px' }}>
          {Object.keys(modelConfig.extraBody || {}).length}
        </Badge>
        <Button
          size="sm"
          variant="secondary"
          style={{ padding: '2px 6px', lineHeight: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            addModelKV(modelId);
            setIsOpen(true);
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px',
            borderTop: '1px solid var(--color-border-glass)',
            background: 'var(--color-bg-subtle)',
          }}
        >
          {Object.entries(modelConfig.extraBody || {}).length === 0 && (
            <div className="font-body text-text-secondary text-[11px] italic">
              No extra body fields configured.
            </div>
          )}
          {Object.entries(modelConfig.extraBody || {}).map(
            ([key, val]: [string, any], idx: number) => (
              <ExtraBodyFieldRow
                key={idx}
                fieldKey={key}
                value={val}
                onKeyChange={(newKey: string) => updateModelKV(modelId, key, newKey, val)}
                onValueChange={(newValue: unknown) => updateModelKV(modelId, key, key, newValue)}
                onRemove={() => removeModelKV(modelId, key)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
