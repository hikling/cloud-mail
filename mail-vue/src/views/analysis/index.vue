<template>
  <div v-if="analysisLoading" class="analysis-loading">
    <loading/>
  </div>
  <el-scrollbar v-else class="analysis-scroll">
    <div class="analysis" :key="boxKey">
      <div class="number">
        <div class="number-item">
          <div class="top">
            <div class="left">
              <div class="metric-label">{{ $t('totalReceived') }}</div>
              <div class="metric-val">
                <el-statistic :formatter="value => Math.round(value)" :value="receiveData"/>
              </div>
            </div>
            <div class="count-icon tone-blue">
              <Icon icon="lucide:inbox" width="20" height="20"></Icon>
            </div>
          </div>
          <div class="delete-ratio">
            <span class="ratio-pill active">
              <i></i>{{ $t('active') }} <b>{{ numberCount.normalReceiveTotal }}</b>
            </span>
            <span class="ratio-pill deleted">
              <i></i>{{ $t('deleted') }} <b>{{ numberCount.delReceiveTotal }}</b>
            </span>
          </div>
        </div>

        <div class="number-item">
          <div class="top">
            <div class="left">
              <div class="metric-label">{{ $t('totalSent') }}</div>
              <div class="metric-val">
                <el-statistic :formatter="value => Math.round(value)" :value="sendData"/>
              </div>
            </div>
            <div class="count-icon tone-emerald">
              <Icon icon="lucide:send" width="20" height="20"></Icon>
            </div>
          </div>
          <div class="delete-ratio">
            <span class="ratio-pill active">
              <i></i>{{ $t('active') }} <b>{{ numberCount.normalSendTotal }}</b>
            </span>
            <span class="ratio-pill deleted">
              <i></i>{{ $t('deleted') }} <b>{{ numberCount.delSendTotal }}</b>
            </span>
          </div>
        </div>

        <div class="number-item">
          <div class="top">
            <div class="left">
              <div class="metric-label">{{ $t('totalMailboxes') }}</div>
              <div class="metric-val">
                <el-statistic :formatter="value => Math.round(value)" :value="accountData"/>
              </div>
            </div>
            <div class="count-icon tone-violet">
              <Icon icon="lucide:mail" width="20" height="20"></Icon>
            </div>
          </div>
          <div class="delete-ratio">
            <span class="ratio-pill active">
              <i></i>{{ $t('active') }} <b>{{ numberCount.normalAccountTotal }}</b>
            </span>
            <span class="ratio-pill deleted">
              <i></i>{{ $t('deleted') }} <b>{{ numberCount.delAccountTotal }}</b>
            </span>
          </div>
        </div>

        <div class="number-item">
          <div class="top">
            <div class="left">
              <div class="metric-label">{{ $t('totalUsers') }}</div>
              <div class="metric-val">
                <el-statistic :formatter="value => Math.round(value)" :value="userData"/>
              </div>
            </div>
            <div class="count-icon tone-amber">
              <Icon icon="lucide:users" width="20" height="20"></Icon>
            </div>
          </div>
          <div class="delete-ratio">
            <span class="ratio-pill active">
              <i></i>{{ $t('active') }} <b>{{ numberCount.normalUserTotal }}</b>
            </span>
            <span class="ratio-pill deleted">
              <i></i>{{ $t('deleted') }} <b>{{ numberCount.delUserTotal }}</b>
            </span>
          </div>
        </div>
      </div>

      <div class="picture">
        <div class="chart-card">
          <div class="card-head">
            <span class="title">{{ $t('emailSource') }}</span>
            <span class="source-button" v-if="false">
              <el-radio-group v-model="checkedSourceType">
                <el-radio-button label="发件人" value="sender"/>
                <el-radio-button label="邮箱" value="email"/>
              </el-radio-group>
            </span>
          </div>
          <div class="sender-pie"></div>
        </div>
        <div class="chart-card">
          <div class="card-head">
            <span class="title">{{ $t('userGrowth') }}</span>
          </div>
          <div class="increase-line"></div>
        </div>
      </div>

      <div class="picture-cs">
        <div class="chart-card">
          <div class="card-head">
            <span class="title">{{ $t('emailGrowth') }}</span>
          </div>
          <div class="email-column"></div>
        </div>
        <div class="chart-card">
          <div class="card-head">
            <span class="title">{{ $t('sentToday') }}</span>
          </div>
          <div class="send-count"></div>
        </div>
      </div>
    </div>
  </el-scrollbar>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import {useTransition} from "@vueuse/core";
import {defineOptions, onActivated, onDeactivated, onMounted, onBeforeUnmount, reactive, ref, watch, computed} from "vue";
import echarts from "@/echarts/index.js";
import dayjs from "dayjs";
import {analysisEcharts} from "@/request/analysis.js";
import {useUiStore} from "@/store/ui.js";
import {debounce} from "lodash-es";
import loading from "@/components/loading/index.vue";
import {useRoute} from "vue-router";
import {useI18n} from 'vue-i18n';

defineOptions({
  name: 'analysis'
})

const {t} = useI18n();
const route = useRoute();
const uiStore = useUiStore()
const checkedSourceType = ref('sender')
const receiveTotal = ref(0)
const sendTotal = ref(0)
const accountTotal = ref(0)
const userTotal = ref(0)
const analysisLoading = ref(true)

const numberCount = reactive({
  normalReceiveTotal: 0,
  normalSendTotal: 0,
  normalAccountTotal: 0,
  normalUserTotal: 0,
  delReceiveTotal: 0,
  delSendTotal: 0,
  delAccountTotal: 0,
  delUserTotal: 0
})

const receiveData = useTransition(receiveTotal, { duration: 1500 })
const sendData = useTransition(sendTotal, { duration: 1500 })
const accountData = useTransition(accountTotal, { duration: 1500 })
const userData = useTransition(userTotal, { duration: 1500 })

const senderData = ref(null)
const userLineData = reactive({
  xdata: [],
  sdata: []
})

const emailColumnData = {
  receiveData: [],
  sendData: [],
  daysData: []
}

const topic = computed(() => ({
  color: uiStore.dark ? '#F1F5F9' : '#0F172A',
  background: uiStore.dark ? '#171B24' : '#FFFFFF',
  borderColor: uiStore.dark ? '#11141B' : '#FFFFFF',
  scaleLineColor: uiStore.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
  crossColor: uiStore.dark ? '#64748B' : '#94A3B8',
  axisColor: uiStore.dark ? '#94A3B8' : '#64748B',
  splitLineColor: uiStore.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
  gaugeSplitLine: uiStore.dark ? '#94A3B8' : '#64748B',
  containerBackground: uiStore.dark ? '#1E2430' : '#E2E8F0'
}))

let daySendTotal = 0
let leaveWidth = 0
let senderPie = null
let increaseLine = null
let emailColumn = null
let sendGauge = null
let first = true
let boxKey = ref(0)
let senderPieLeft = window.innerWidth < 500 ? `${window.innerWidth - 110}` : '72%'
let analysisDark = uiStore.dark

const handleResize = () => {
  setStyle()
  widthChange()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  analysisEcharts(timeZone).then(data => {
    receiveTotal.value = data.numberCount.receiveTotal
    sendTotal.value = data.numberCount.sendTotal
    accountTotal.value = data.numberCount.accountTotal
    userTotal.value = data.numberCount.userTotal
    numberCount.normalReceiveTotal = data.numberCount.normalReceiveTotal
    numberCount.normalSendTotal = data.numberCount.normalSendTotal
    numberCount.normalAccountTotal = data.numberCount.normalAccountTotal
    numberCount.normalUserTotal = data.numberCount.normalUserTotal
    numberCount.delReceiveTotal = data.numberCount.delReceiveTotal
    numberCount.delSendTotal = data.numberCount.delSendTotal
    numberCount.delAccountTotal = data.numberCount.delAccountTotal
    numberCount.delUserTotal = data.numberCount.delUserTotal
    senderData.value = data.receiveRatio.nameRatio.map(item => {
      return {
        name: item.name || ' ',
        value: item.total
      }
    })

    userLineData.xdata = data.userDayCount.map(item => dayjs(item.date).format("M.D"));
    userLineData.sdata = data.userDayCount.map(item => item.total)

    emailColumnData.daysData = data.emailDayCount.receiveDayCount.map(item => dayjs(item.date).format("M.D"))
    emailColumnData.receiveData = data.emailDayCount.receiveDayCount.map(item => item.total)
    emailColumnData.sendData = data.emailDayCount.sendDayCount.map(item => item.total)
    daySendTotal = data.daySendTotal
    analysisLoading.value = false
    initPicture();
    first = false
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const widthChange = debounce(initPicture, 500, {
  leading: false,
  trailing: true
})

watch(() => uiStore.asideShow, () => {
  if (window.innerWidth > 1024) {
    widthChange()
  }
})

onActivated(() => {
  if (first) return
  if (window.innerWidth !== leaveWidth && leaveWidth !== 0) {
    widthChange()
  } else if (!senderPie) {
    widthChange()
  } else if (analysisDark !== uiStore.dark) {
    initPicture()
    analysisDark = uiStore.dark
  }
})

onDeactivated(() => {
  leaveWidth = window.innerWidth
})

watch(() => uiStore.dark, () => {
  if (route.name !== 'analysis') return
  analysisDark = uiStore.dark
  initPicture()
})

function initPicture() {
  if (route.name !== 'analysis') return
  boxKey.value++
  setTimeout(() => {
    createSenderPie()
    createIncreaseLine()
    createEmailColumnChart();
    createSendGauge();
  })
}

function setStyle() {
  senderPieLeft = window.innerWidth < 500 ? `${window.innerWidth - 110}` : '72%'
  emailColumnData.barWidth = window.innerWidth > 767 ? '40%' : '60%'
}

const measureCtx = document.createElement('canvas').getContext('2d');
measureCtx.font = '12px sans-serif';

function truncateTextByWidth(text, maxWidth = 140) {
  let width = measureCtx.measureText(text).width;
  if (width <= maxWidth) return text;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += text[i];
    if (measureCtx.measureText(result + '…').width > maxWidth) {
      return result.slice(0, -1) + '…';
    }
  }
  return text;
}

function createSenderPie() {
  const el = document.querySelector(".sender-pie")
  if (!el) return
  if (senderPie) {
    senderPie.dispose()
  }
  senderPie = echarts.init(el)
  let option = {
    tooltip: {
      trigger: 'item',
      textStyle: { color: topic.value.color },
      backgroundColor: topic.value.background,
      borderColor: topic.value.splitLineColor,
      borderWidth: 1,
      formatter: params => `${params.marker} ${params.name}： ${params.value} (${params.percent}%)`
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      left: '16',
      top: '16',
      textStyle: { color: topic.value.axisColor, fontSize: 12 },
      formatter: name => truncateTextByWidth(name)
    },
    series: [
      {
        data: senderData.value,
        name: '',
        type: 'pie',
        radius: ['46%', '72%'],
        center: [senderPieLeft, '48%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: topic.value.borderColor,
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          scaleSize: 6
        },
        labelLine: { show: false },
        color: ['#2563EB', '#10B981', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EC4899']
      }
    ]
  }
  senderPie.setOption(option)
}

function createIncreaseLine() {
  const el = document.querySelector(".increase-line")
  if (!el) return
  if (increaseLine) {
    increaseLine.dispose()
  }
  increaseLine = echarts.init(el)

  let option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: topic.value.crossColor, type: 'dashed' }
      },
      formatter: params => {
        let result = ''
        params.forEach(item => {
          result = `${item.marker} ${t('growthTotalUsers')} ${item.value}`;
        });
        return result;
      },
      backgroundColor: topic.value.background,
      borderColor: topic.value.splitLineColor,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: topic.value.color }
    },
    grid: { top: '12%', right: '20', left: '35', bottom: '32' },
    xAxis: {
      type: 'category',
      data: userLineData.xdata,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: topic.value.splitLineColor, width: 1 } },
      axisLabel: {
        color: topic.value.axisColor,
        fontSize: 11.5,
        formatter: (value, index) => {
          if (index === 0) return '      ' + value;
          if (index === userLineData.xdata.length - 1) return value + '   '
          return value;
        }
      },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: { margin: 8, color: topic.value.axisColor, fontSize: 11.5 },
      boundaryGap: [0, 0.1],
      max: (params) => params.max < 8 ? 10 : undefined,
      axisLine: { show: false },
      splitLine: {
        show: true,
        lineStyle: { type: 'dashed', color: topic.value.scaleLineColor }
      }
    },
    series: [
      {
        data: userLineData.sdata,
        type: 'line',
        smooth: 0.35,
        symbol: 'none',
        lineStyle: { color: '#2563EB', width: 2.5 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37, 99, 235, 0.28)' },
            { offset: 1, color: 'rgba(37, 99, 235, 0.01)' }
          ])
        },
        color: ['#2563EB'],
      }
    ]
  };
  increaseLine.setOption(option);

  let max = increaseLine.getModel().getComponent('yAxis', 0).axis.scale.getExtent()[1];
  let left = 35
  if (max > 99) left = 42
  if (max > 999) left = 51
  if (max > 9999) left = 58
  if (max > 99999) left = 66

  increaseLine.setOption({ grid: { left } });
}

function createEmailColumnChart() {
  const el = document.querySelector(".email-column")
  if (!el) return
  if (emailColumn) {
    emailColumn.dispose()
  }
  emailColumn = echarts.init(el);

  const option = {
    tooltip: {
      textStyle: { color: topic.value.color },
      backgroundColor: topic.value.background,
      borderColor: topic.value.splitLineColor,
      borderWidth: 1,
      formatter: params => `${params.marker} ${params.seriesName}: ${params.value}`
    },
    legend: {
      data: [t('emailReceived'), t('emailSent')],
      top: '4',
      right: '16',
      textStyle: { color: topic.value.axisColor, fontSize: 12 }
    },
    grid: { left: '18', right: '18', bottom: '16', top: '44', containLabel: true },
    xAxis: {
      type: 'category',
      data: emailColumnData.daysData,
      axisTick: { show: false },
      axisLabel: { color: topic.value.axisColor, fontSize: 11.5 },
      axisLine: { show: true, lineStyle: { color: topic.value.splitLineColor, width: 1 } }
    },
    yAxis: {
      max: (params) => params.max < 8 ? 10 : undefined,
      splitLine: {
        show: true,
        lineStyle: { color: topic.value.scaleLineColor, type: 'dashed', width: 1 }
      },
      axisLabel: { color: topic.value.axisColor, fontSize: 11.5 },
      axisLine: { show: false },
      type: 'value',
      boundaryGap: [0, 0.1],
    },
    series: [
      {
        name: t('emailReceived'),
        type: 'bar',
        stack: 'total',
        barWidth: '55%',
        barMaxWidth: 26,
        data: emailColumnData.receiveData,
        itemStyle: { color: '#3B82F6', borderRadius: [0, 0, 4, 4] }
      },
      {
        name: t('emailSent'),
        type: 'bar',
        stack: 'total',
        data: emailColumnData.sendData,
        itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] }
      }
    ]
  };
  emailColumn.setOption(option);
}

function createSendGauge() {
  const el = document.querySelector(".send-count")
  if (!el) return
  if (sendGauge) {
    sendGauge.dispose()
  }
  sendGauge = echarts.init(el);
  let option = {
    tooltip: {
      textStyle: { color: topic.value.color },
      backgroundColor: topic.value.background,
      borderColor: topic.value.splitLineColor,
      borderWidth: 1
    },
    series: [{
      name: t('sentToday'),
      type: 'gauge',
      max: daySendTotal >= 1000 ? 10000 : daySendTotal >= 100 ? 1000 : 100,
      progress: {
        show: true,
        roundCap: true,
        width: 12,
        itemStyle: { color: '#2563EB' }
      },
      pointer: {
        itemStyle: { color: '#2563EB' }
      },
      axisLabel: { color: topic.value.axisColor, fontSize: 11 },
      axisLine: {
        roundCap: true,
        lineStyle: { width: 12, color: [[1, topic.value.containerBackground]] }
      },
      splitLine: {
        lineStyle: { color: topic.value.gaugeSplitLine }
      },
      axisTick: {
        lineStyle: { color: topic.value.axisColor }
      },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        fontSize: 24,
        fontWeight: 700,
        color: topic.value.color
      },
      data: [{
        value: daySendTotal,
        name: t('total'),
        title: { color: topic.value.axisColor, fontSize: 12 }
      }]
    }],
    color: ['#2563EB']
  };
  sendGauge.setOption(option);
}
</script>

<style scoped lang="scss">
.analysis-loading,
.analysis-scroll {
  height: 100%;
  background: var(--app-canvas);
}

.analysis-loading {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis {
  max-width: 1480px;
  margin: 0 auto;
  padding: 22px 24px 36px;
  gap: 18px;
  display: grid;
  grid-auto-rows: min-content;

  @media (max-width: 1024px) {
    padding: 16px 14px 30px;
    gap: 14px;
  }
}

.number {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1366px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.number-item {
  background: var(--surface-primary);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  padding: 18px 20px;
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-sm);
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;

    .left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    :deep(.el-statistic__number) {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.025em;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    .count-icon {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.tone-blue { background: rgba(37, 99, 235, 0.11); color: #2563EB; }
      &.tone-emerald { background: rgba(16, 185, 129, 0.12); color: #10B981; }
      &.tone-violet { background: rgba(139, 92, 246, 0.12); color: #8B5CF6; }
      &.tone-amber { background: rgba(245, 158, 11, 0.13); color: #F59E0B; }
    }
  }

  .delete-ratio {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ratio-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);

    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    b {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    &.active i { background: #10B981; }
    &.deleted i { background: #EF4444; }
  }
}

.picture {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) 1.4fr;
  gap: 16px;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
}

.picture-cs {
  display: grid;
  grid-template-columns: 1.4fr minmax(340px, 0.9fr);
  gap: 16px;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--surface-primary);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
  overflow: hidden;

  .card-head {
    padding: 15px 18px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .sender-pie,
  .increase-line,
  .email-column,
  .send-count {
    height: 310px;
    @media (max-width: 767px) {
      height: 250px;
    }
  }
}
</style>
