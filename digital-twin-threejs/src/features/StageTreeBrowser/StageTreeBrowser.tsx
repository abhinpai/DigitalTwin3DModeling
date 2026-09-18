import { Button, HideIcon, Hierarchy, HierarchyNode, Input, SearchIcon, ShowIcon, type HierarchyNodeProps } from '@forge/common';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { IStageTreeNode } from '../../types/stageTreeNode';

const EMPTY_IDS: string[] = [];

export interface IStageTreeBrowserProps {
  root: IStageTreeNode | null;
  selectedNodeIds?: string[];
  hiddenNodeIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onVisibilityChange?: (hiddenNodeIds: string[]) => void;
  className?: string;
}

function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

interface IFilteredTreeResult {
  tree: IStageTreeNode | null;
  forceExpandedNodeIds: Set<string>;
}

function findAncestorNodeIds(root: IStageTreeNode | null, targetId: string): string[] {
  if (!root) {
    return [];
  }

  const visit = (node: IStageTreeNode, ancestors: string[]): string[] | null => {
    if (node.id === targetId) {
      return ancestors;
    }

    for (const child of node.children) {
      const result = visit(child, [...ancestors, node.id]);

      if (result) {
        return result;
      }
    }

    return null;
  };

  return visit(root, []) ?? [];
}

function filterStageTree(root: IStageTreeNode | null, filterValue: string): IFilteredTreeResult {
  if (!root) {
    return {
      tree: null,
      forceExpandedNodeIds: new Set<string>(),
    };
  }

  const query = filterValue.trim().toLowerCase();

  if (!query) {
    return {
      tree: root,
      forceExpandedNodeIds: new Set<string>(),
    };
  }

  const forceExpandedNodeIds = new Set<string>();

  const visit = (node: IStageTreeNode): { node: IStageTreeNode | null; matchesSubtree: boolean } => {
    const matchesSelf = node.name.toLowerCase().includes(query);
    const filteredChildren = node.children
      .map(visit)
      .filter((child): child is { node: IStageTreeNode; matchesSubtree: boolean } => child.node !== null);

    const matchesSubtree = matchesSelf || filteredChildren.length > 0;

    if (!matchesSubtree) {
      return { node: null, matchesSubtree: false };
    }

    if (filteredChildren.length > 0) {
      forceExpandedNodeIds.add(node.id);
    }

    return {
      node: {
        ...node,
        children: filteredChildren.map((child) => child.node),
      },
      matchesSubtree,
    };
  };

  const result = visit(root);

  return {
    tree: result.node,
    forceExpandedNodeIds,
  };
}

export function StageTreeBrowser({
  root,
  selectedNodeIds,
  hiddenNodeIds,
  onSelectionChange,
  onVisibilityChange,
  className,
}: IStageTreeBrowserProps) {
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const selected = selectedNodeIds ?? EMPTY_IDS;
  const selectedId = selected[0];
  const hidden = hiddenNodeIds ?? EMPTY_IDS;
  const [hierarchySyncState, setHierarchySyncState] = useState(() => ({
    instanceKey: 0,
    defaultSelectedId: selectedId,
  }));
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const { tree, forceExpandedNodeIds } = useMemo(() => filterStageTree(root, filterValue), [root, filterValue]);
  const selectedExpandedNodeIds = useMemo(() => {
    const ids = new Set<string>();

    for (const id of selected) {
      for (const ancestorId of findAncestorNodeIds(root, id)) {
        ids.add(ancestorId);
      }
    }

    return ids;
  }, [root, selected]);
  const effectiveExpandedNodes = useMemo(
    () => Array.from(new Set([...expandedNodes, ...forceExpandedNodeIds, ...selectedExpandedNodeIds])),
    [expandedNodes, forceExpandedNodeIds, selectedExpandedNodeIds],
  );
  const expandedNodeSet = useMemo(() => new Set(effectiveExpandedNodes), [effectiveExpandedNodes]);

  useEffect(() => {
    setHierarchySyncState((current) => (
      current.defaultSelectedId === selectedId
        ? current
        : {
          instanceKey: current.instanceKey + 1,
          defaultSelectedId: selectedId,
        }
    ));
  }, [selectedId]);

  useEffect(() => {
    const selectedId = selected[0];

    if (!selectedId || !tree) {
      return;
    }

    const scrollSelectedNodeIntoView = () => {
      const element = treeContainerRef.current?.querySelector(`[data-stage-tree-node-id="${selectedId}"]`);

      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    };

    scrollSelectedNodeIntoView();

    const timeoutId = window.setTimeout(scrollSelectedNodeIntoView, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [effectiveExpandedNodes, selected, tree]);

  if (!root) {
    return (
      <section
        aria-label="Stage tree browser"
        className={[
          'flex h-full w-full items-center justify-center overflow-hidden border border-dashed border-[rgb(var(--color-gray-300))] bg-[rgb(var(--color-container))] p-4 text-center text-sm text-[rgb(var(--color-typography-secondary))] dark:border-[rgb(var(--color-gray-800))] dark:bg-[rgb(var(--color-container-dark))] dark:text-[rgb(var(--color-typography-secondary-dark))]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        Waiting for a 3D model to render.
      </section>
    );
  }

  const renderNode = (node: IStageTreeNode): ReactElement<HierarchyNodeProps> => {
    const isHidden = hiddenSet.has(node.id);

    return (
      <HierarchyNode
        key={node.id}
        id={node.id}
        title={node.name}
        selectable
        isSelected={selected.includes(node.id)}
        isExpanded={expandedNodeSet.has(node.id)}
        onSelect={() => {
          onSelectionChange?.([node.id]);
        }}
        onExpand={() => {
          setExpandedNodes((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
        }}
        suffix={(
          <Button
            variant="quiet-secondary"
            size="regular"
            data-stage-tree-node-id={node.id}
            aria-label={isHidden ? `Show ${node.name}` : `Hide ${node.name}`}
            icon={isHidden ? <ShowIcon /> : <HideIcon />}
            onClick={(event) => {
              event?.stopPropagation();
              onVisibilityChange?.(toggleId(hidden, node.id));
            }}
          />
        )}
      >
        {node.children.map(renderNode)}
      </HierarchyNode>
    );
  };

  return (
    <section
      aria-label="Stage tree browser"
      className={[
        'h-full w-full overflow-auto bg-[rgb(var(--color-container))] dark:bg-[rgb(var(--color-container-dark))]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="border-b border-[rgb(var(--color-gray-300))] p-2 dark:border-[rgb(var(--color-gray-800))]">
        <Input
          id="stage-tree-browser-filter"
          aria-label="Filter stage tree"
          type="text"
          value={filterValue}
          onChange={(event) => {
            setFilterValue(event.target.value);
          }}
          placeholder="Filter by name"
          prefix={<SearchIcon />}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="regular"
            variant="quiet-secondary"
            aria-label="Show all nodes"
            onClick={() => {
              onVisibilityChange?.([]);
            }}
          >
            Show all
          </Button>
        </div>
      </div>

      <div ref={treeContainerRef} className="h-full overflow-auto">
        {!tree ? (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-[rgb(var(--color-typography-secondary))] dark:text-[rgb(var(--color-typography-secondary-dark))]">
            No matching nodes found.
          </div>
        ) : (
          <Hierarchy
            key={hierarchySyncState.instanceKey}
            aria-label="Stage tree"
            defaultSelectedId={hierarchySyncState.defaultSelectedId}
          >
            {[renderNode(tree)]}
          </Hierarchy>
        )}
      </div>
    </section>
  );
}
