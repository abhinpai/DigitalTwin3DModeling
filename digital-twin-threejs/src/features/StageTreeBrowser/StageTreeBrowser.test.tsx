import { fireEvent, render, screen } from '@testing-library/react';
import { type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IStageTreeNode } from '../../types/stageTreeNode';
import { StageTreeBrowser } from './StageTreeBrowser';

vi.mock('@forge/common', () => ({
  Hierarchy: ({ children, defaultSelectedId: _defaultSelectedId, ...props }: {
    children?: ReactNode;
    defaultSelectedId?: string;
  }) => {
    return (
      <ul {...props}>{children}</ul>
    );
  },
  HierarchyNode: ({
    id,
    title,
    suffix,
    children,
    isSelected,
    isExpanded,
    onSelect,
    onExpand,
  }: {
    id: string;
    title: ReactNode;
    suffix?: ReactNode;
    children?: ReactNode;
    isSelected?: boolean;
    isExpanded?: boolean;
    onSelect?: (event: { id: string; selected: boolean; e: ReactMouseEvent<HTMLElement> }) => void;
    onExpand?: (event: { id: string; expanded: boolean; e: ReactMouseEvent<HTMLElement> }) => void;
  }) => {
    return (
      <li
        data-testid={`node-${id}`}
        role="treeitem"
        aria-selected={isSelected}
        onClick={(event) => onSelect?.({ id, selected: !isSelected, e: event })}
      >
        <button
          type="button"
          data-testid={`toggle-${id}`}
          onClick={(event) => {
            event.stopPropagation();
            onExpand?.({ id, expanded: !isExpanded, e: event });
          }}
        >
          toggle-{id}
        </button>
        <button
          type="button"
          data-testid={`select-${id}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.({ id, selected: !isSelected, e: event });
          }}
        >
          {title}
        </button>
        {suffix}
        {isExpanded ? <ul>{children}</ul> : null}
      </li>
    );
  },
  Button: ({ onClick, icon, children, ...props }: { onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void; icon?: ReactNode; children?: ReactNode; [key: string]: unknown }) => (
    <button type="button" onClick={onClick} {...props}>
      {icon}
      {children}
    </button>
  ),
  Input: ({ prefix, ...props }: { prefix?: ReactNode; [key: string]: unknown }) => (
    <label>
      {prefix}
      <input {...props} />
    </label>
  ),
  SearchIcon: () => <span>search-icon</span>,
  ShowIcon: () => <span>show-icon</span>,
  HideIcon: () => <span>hide-icon</span>,
}));

const ROOT: IStageTreeNode = {
  id: 'root-id',
  name: 'Root Group',
  type: 'group',
  children: [
    {
      id: 'child-id',
      name: 'Child Mesh',
      type: 'mesh',
      children: [],
    },
    {
      id: 'floor-id',
      name: 'Floor Group',
      type: 'group',
      children: [
        {
          id: 'room-id',
          name: 'Room Group',
          type: 'group',
          children: [
            {
              id: 'sensor-id',
              name: 'Temperature Sensor',
              type: 'mesh',
              children: [],
            },
          ],
        },
      ],
    },
  ],
};

describe('StageTreeBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder state when root is null', () => {
    render(<StageTreeBrowser root={null} />);

    expect(screen.getByLabelText('Stage tree browser')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a 3D model to render.')).toBeInTheDocument();
  });

  it('renders tree nodes when root is provided', () => {
    render(<StageTreeBrowser root={ROOT} />);

    expect(screen.getByText('Root Group')).toBeInTheDocument();
    expect(screen.queryByText('Child Mesh')).not.toBeInTheDocument();
  });

  it('expands nodes using internal expanded state', () => {
    render(<StageTreeBrowser root={ROOT} />);

    fireEvent.click(screen.getByTestId('toggle-root-id'));

    expect(screen.getByText('Child Mesh')).toBeInTheDocument();
  });

  it('filters by deep match and auto-expands ancestors to reveal result', () => {
    render(<StageTreeBrowser root={ROOT} />);

    fireEvent.change(screen.getByLabelText('Filter stage tree'), { target: { value: 'temperature' } });

    expect(screen.getByText('Root Group')).toBeInTheDocument();
    expect(screen.getByText('Floor Group')).toBeInTheDocument();
    expect(screen.getByText('Room Group')).toBeInTheDocument();
    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
    expect(screen.queryByText('Child Mesh')).not.toBeInTheDocument();
  });

  it('matches filter case-insensitively', () => {
    render(<StageTreeBrowser root={ROOT} />);

    fireEvent.change(screen.getByLabelText('Filter stage tree'), { target: { value: 'TeMpErAtUrE' } });

    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
  });

  it('renders no-results state when filter matches nothing', () => {
    render(<StageTreeBrowser root={ROOT} />);

    fireEvent.change(screen.getByLabelText('Filter stage tree'), { target: { value: 'does-not-exist' } });

    expect(screen.getByText('No matching nodes found.')).toBeInTheDocument();
    expect(screen.queryByText('Root Group')).not.toBeInTheDocument();
  });

  it('clearing filter restores full tree and previous manual expand state', () => {
    render(<StageTreeBrowser root={ROOT} />);

    fireEvent.click(screen.getByTestId('toggle-root-id'));
    expect(screen.getByText('Child Mesh')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter stage tree'), { target: { value: 'temperature' } });
    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
    expect(screen.queryByText('Child Mesh')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter stage tree'), { target: { value: '' } });

    expect(screen.getByText('Child Mesh')).toBeInTheDocument();
    expect(screen.getByText('Floor Group')).toBeInTheDocument();
    expect(screen.queryByText('Temperature Sensor')).not.toBeInTheDocument();
  });

  it('auto-expands ancestor path for externally selected deep node ids', () => {
    render(<StageTreeBrowser root={ROOT} selectedNodeIds={['sensor-id']} />);

    expect(screen.getByText('Floor Group')).toBeInTheDocument();
    expect(screen.getByText('Room Group')).toBeInTheDocument();
    expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
  });

  it('emits single-select ids on selection changes', () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(<StageTreeBrowser root={ROOT} onSelectionChange={onSelectionChange} selectedNodeIds={[]} />);

    fireEvent.click(screen.getByTestId('select-root-id'));

    expect(onSelectionChange).toHaveBeenCalledWith(['root-id']);

    rerender(<StageTreeBrowser root={ROOT} onSelectionChange={onSelectionChange} selectedNodeIds={['root-id']} />);
    fireEvent.click(screen.getByTestId('select-root-id'));

    expect(onSelectionChange).toHaveBeenLastCalledWith(['root-id']);
  });

  it('toggles visibility membership for a node', () => {
    const onVisibilityChange = vi.fn();
    const { rerender } = render(<StageTreeBrowser root={ROOT} hiddenNodeIds={[]} onVisibilityChange={onVisibilityChange} />);

    fireEvent.click(screen.getByLabelText('Hide Root Group'));

    expect(onVisibilityChange).toHaveBeenCalledWith(['root-id']);
    expect(screen.getByText('hide-icon')).toBeInTheDocument();

    rerender(<StageTreeBrowser root={ROOT} hiddenNodeIds={['root-id']} onVisibilityChange={onVisibilityChange} />);
    fireEvent.click(screen.getByLabelText('Show Root Group'));

    expect(onVisibilityChange).toHaveBeenCalledWith([]);
    expect(screen.getByText('show-icon')).toBeInTheDocument();
  });

  it('does not emit selection change when visibility button is clicked', () => {
    const onSelectionChange = vi.fn();
    const onVisibilityChange = vi.fn();

    render(
      <StageTreeBrowser
        root={ROOT}
        selectedNodeIds={[]}
        hiddenNodeIds={[]}
        onSelectionChange={onSelectionChange}
        onVisibilityChange={onVisibilityChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Hide Root Group'));

    expect(onVisibilityChange).toHaveBeenCalledWith(['root-id']);
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('updates selected styling when selected ids become empty', () => {
    const { rerender } = render(<StageTreeBrowser root={ROOT} selectedNodeIds={['root-id']} />);

    expect(screen.getByTestId('node-root-id')).toHaveAttribute('aria-selected', 'true');

    rerender(<StageTreeBrowser root={ROOT} selectedNodeIds={[]} />);

    expect(screen.getByTestId('node-root-id')).toHaveAttribute('aria-selected', 'false');
  });

  it('show all clears hidden nodes', () => {
    const onVisibilityChange = vi.fn();

    render(
      <StageTreeBrowser
        root={ROOT}
        hiddenNodeIds={['root-id']}
        onVisibilityChange={onVisibilityChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Show all nodes'));

    expect(onVisibilityChange).toHaveBeenCalledWith([]);
  });

  it('applies className for loaded and placeholder states', () => {
    const { rerender } = render(<StageTreeBrowser root={ROOT} className="custom-class" />);

    expect(screen.getByLabelText('Stage tree browser')).toHaveClass('custom-class');

    rerender(<StageTreeBrowser root={null} className="custom-class" />);

    expect(screen.getByLabelText('Stage tree browser')).toHaveClass('custom-class');
  });

  it('scrolls selected row into view after auto-expanding ancestors', () => {
    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      render(<StageTreeBrowser root={ROOT} selectedNodeIds={['sensor-id']} />);

      expect(screen.getByText('Temperature Sensor')).toBeInTheDocument();
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: 'nearest', behavior: 'auto' });
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
