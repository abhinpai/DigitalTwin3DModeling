import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ThreejsCanvas, type IStageTreeNode } from '../../index';
import { StageTreeBrowser } from './StageTreeBrowser';

const meta: Meta<typeof StageTreeBrowser> = {
  title: 'Threejs/StageTreeBrowser',
  component: StageTreeBrowser,
  parameters: {
    fullBleed: true,
  },
};

export default meta;

type Story = StoryObj<typeof StageTreeBrowser>;

const storyWrapperStyle = {
  width: '100%',
  height: '100vh',
};

const sidebarStyle = {
  width: 360,
  borderLeft: '1px solid rgb(var(--color-gray-300))',
};

function CanvasAndStageTreeBrowserStory() {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<string[]>([]);
  const [root, setRoot] = useState<IStageTreeNode | null>(null);

  return (
    <div style={{ ...storyWrapperStyle, display: 'flex' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <ThreejsCanvas
          modelUrl="/models/richardson.glb"
          selectedNodeIds={selectedNodeIds}
          hiddenNodeIds={hiddenNodeIds}
          onStageTreeChange={setRoot}
          onNodeSelect={(id) => setSelectedNodeIds(id ? [id] : [])}
        />
      </div>
      <div style={sidebarStyle}>
        <StageTreeBrowser
          root={root}
          selectedNodeIds={selectedNodeIds}
          hiddenNodeIds={hiddenNodeIds}
          onSelectionChange={setSelectedNodeIds}
          onVisibilityChange={setHiddenNodeIds}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  args: {
    root: null,
  },
};

export const WithThreejsCanvas: Story = {
  render: () => <CanvasAndStageTreeBrowserStory />,
};
