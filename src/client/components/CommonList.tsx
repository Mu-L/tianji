import React, { ComponentProps } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/utils/style';
import { Badge } from './ui/badge';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { LuSearch } from 'react-icons/lu';
import { Input } from './ui/input';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { Empty } from 'antd';
import { globalEventBus } from '@/utils/event';
import { Spinner } from './ui/spinner';
import { formatNumber } from '@/utils/common';

export interface CommonListItem {
  id: string;
  title: string;
  number?: number;
  content?: React.ReactNode;
  tags?: (string | React.ReactElement)[];
  href: string;
}

interface CommonListProps {
  isLoading?: boolean;
  hasSearch?: boolean;
  direction?: 'horizontal' | 'vertical';
  items: CommonListItem[];
  emptyDescription?: React.ReactNode;
}
export const CommonList: React.FC<CommonListProps> = React.memo((props) => {
  const { direction = 'vertical' } = props;
  const { location } = useRouterState();
  const navigate = useNavigate();

  const { searchText, setSearchText, searchResult } = useFuseSearch(
    props.items,
    {
      keys: [
        {
          name: 'title',
          weight: 1,
        },
        {
          name: 'id',
          weight: 0.6,
        },
        {
          name: 'tags',
          weight: 0.4,
        },
      ],
    }
  );

  const finalList = searchResult ?? props.items;

  return (
    <div className="flex h-full flex-col">
      {props.hasSearch && (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 px-4 py-2 backdrop-blur">
          <form>
            <div className="relative">
              <LuSearch className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
              <Input
                placeholder="Search"
                className="pl-8"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </form>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 px-4 py-2">
          {props.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size={24} />
            </div>
          )}

          {finalList.length === 0 && !props.isLoading && (
            <Empty description={props.emptyDescription} />
          )}

          {finalList.map((item) => {
            const isSelected = item.href === location.pathname;

            return (
              <button
                key={item.id}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all',
                  'hover:bg-gray-50 dark:hover:bg-gray-900',
                  isSelected && 'bg-gray-50 dark:bg-gray-900'
                )}
                onClick={() => {
                  globalEventBus.emit('commonListSelected');
                  navigate({
                    to: item.href,
                  });
                }}
              >
                <div
                  className={cn(
                    'flex w-full gap-2',
                    direction === 'vertical' && 'flex-col'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-between gap-1',
                      direction === 'vertical' && 'w-full',
                      direction === 'horizontal' &&
                        'flex-1 overflow-hidden text-ellipsis'
                    )}
                  >
                    <div className="overflow-hidden text-ellipsis font-semibold">
                      {item.title}
                    </div>

                    {item.number && item.number > 0 && (
                      <span className="opacity-60" title={String(item.number)}>
                        {formatNumber(item.number)}
                      </span>
                    )}
                  </div>

                  {item.content && (
                    <div
                      className={cn(
                        'text-muted-foreground line-clamp-2 text-xs',
                        direction === 'vertical' && 'w-full',
                        direction === 'horizontal' && 'flex-shrink-0'
                      )}
                    >
                      {item.content}
                    </div>
                  )}
                </div>

                {Array.isArray(item.tags) && item.tags.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {item.tags.map((tag) =>
                      React.isValidElement(tag) ? (
                        tag
                      ) : (
                        <Badge
                          key={String(tag)}
                          variant={getBadgeVariantFromLabel(String(tag))}
                        >
                          {tag}
                        </Badge>
                      )
                    )}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
});
CommonList.displayName = 'CommonList';

function getBadgeVariantFromLabel(
  label: string
): ComponentProps<typeof Badge>['variant'] {
  if (['work'].includes(String(label).toLowerCase())) {
    return 'default';
  }

  if (['personal'].includes(String(label).toLowerCase())) {
    return 'outline';
  }

  return 'secondary';
}
