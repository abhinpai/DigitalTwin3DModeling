import type { Meta, StoryObj } from '@storybook/react';
import { ThreeJsRender } from './ThreeJsRender';

const meta: Meta<typeof ThreeJsRender> = {
  title: 'Threejs/ThreeJsRender',
  component: ThreeJsRender,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ThreeJsRender>;

const storyWrapperStyle = {
  width: '100%',
  height: '100vh',
};

export const Default: Story = {
  args: {
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
    visualMode: 'original',
  },
  render: (args) => (
    <div style={storyWrapperStyle}>
      <ThreeJsRender {...args} />
    </div>
  ),
};
