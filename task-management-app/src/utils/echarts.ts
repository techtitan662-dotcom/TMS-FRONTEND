import * as echarts from 'echarts/core';
import type { ECharts } from 'echarts/core';
import type { EChartsOption } from 'echarts/types/dist/shared';
import {
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
} from 'echarts/charts';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

export type { ECharts, EChartsOption };

/**
 * Optimized ECharts initialization for Tree-shaking.
 * Use this instead of importing from 'echarts' directly.
 */
echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DatasetComponent,
    TransformComponent,
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    LabelLayout,
    UniversalTransition,
    CanvasRenderer
]);

export default echarts;
