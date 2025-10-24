import React, { useState } from 'react';
import { PopoverTrigger } from '@/components/ui/popover';
import { Input } from '../ui/input';
import { useTranslation } from '@i18next-toolkit/react';
import { formatNumber } from '@/utils/common';
import {
  LuEllipsisVertical,
  LuMousePointerClick,
  LuTrash2,
} from 'react-icons/lu';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DropdownSelect } from './DropdownSelect';
import { MetricsInfo, numberToLetter } from '@tianji/shared';
import { getMetricLabel } from './utils/common';

interface MetricsBlockProps {
  index: number;
  list: { name: string; label?: string; count: number }[];
  info: MetricsInfo | null;
  onSelect: (info: MetricsInfo) => void;
  onDelete: () => void;
}
export const MetricsBlock: React.FC<MetricsBlockProps> = React.memo((props) => {
  const { t } = useTranslation();
  const [filterText, setFilterText] = useState('');

  const mathMethod = [
    {
      label: t('Total Events'),
      name: 'events',
    },
    {
      label: t('Total Session'),
      name: 'sessions',
    },
  ] satisfies {
    label: string;
    name: MetricsInfo['math'];
  }[];

  const selectedMathMethodLabel =
    mathMethod.find((m) => m.name === props.info?.math)?.label ??
    mathMethod[0].label;

  return (
    <div className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-zinc-300 px-2 py-1 dark:border-zinc-700">
      {/* Event */}
      <DropdownSelect
        dropdownSize="lg"
        defaultIsOpen={props.info === null}
        filterText={filterText}
        list={props.list}
        value={props.info?.name ?? ''}
        onSelect={(name: string) => {
          props.onSelect({
            math: 'events',
            ...props.info,
            name: name,
          });
        }}
        onSelectEmpty={props.onDelete}
        dropdownHeader={
          <div className="mb-2">
            <Input
              placeholder={t('Search Metrics')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        }
        renderItem={(item) => (
          <>
            <LuMousePointerClick className="shrink-0" />
            <span className="overflow-hidden text-ellipsis">
              {item.label ?? item.name}
            </span>
            {typeof item.count === 'number' && item.count > 0 && (
              <span className="text-xs opacity-40">
                ({formatNumber(item.count)})
              </span>
            )}
          </>
        )}
      >
        <div className="flex items-center justify-between">
          <PopoverTrigger asChild>
            <div className="hover:bg-muted flex w-full flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 py-1">
              <div className="h-4 w-4 rounded bg-white bg-opacity-20 text-center text-xs">
                {numberToLetter(props.index + 1)}
              </div>
              <span>
                {getMetricLabel(props.info?.name ?? '') ?? <>&nbsp;</>}
              </span>
            </div>
          </PopoverTrigger>

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button
                  className="h-8 w-8 rounded-lg text-sm hover:bg-white"
                  variant="ghost"
                  size="icon"
                >
                  <LuEllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    props.onDelete();
                  }}
                >
                  <LuTrash2 className="mr-2" />
                  {t('Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DropdownSelect>

      {/* Math */}
      {props.info && props.info.name && (
        <DropdownSelect
          label={selectedMathMethodLabel}
          dropdownHeader={
            <div className="mb-2 px-1 text-xs opacity-40">{t('Measuring')}</div>
          }
          list={mathMethod}
          value={props.info?.math}
          onSelect={(name) => {
            props.onSelect({
              name: '$all_event',
              ...props.info,
              math: name as any,
            });
          }}
        />
      )}
    </div>
  );
});
MetricsBlock.displayName = 'MetricsBlock';
