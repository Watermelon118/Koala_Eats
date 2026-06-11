import { useMemo, useState } from 'react'
import {
  Bike,
  CheckCircle2,
  Clock3,
  Map,
  MapPin,
  Navigation,
  PackageCheck,
  Phone,
  Route,
  ShieldCheck,
} from 'lucide-react'
import { formatDistance, formatMoney } from '../../shared/format'
import { deliveryTasks } from '../../shared/mockData'
import type { DeliveryTask, DeliveryTaskStatus } from '../../shared/types'

const nextDeliveryStatus: Partial<Record<DeliveryTaskStatus, DeliveryTaskStatus>> = {
  Available: 'Accepted',
  Accepted: 'ArrivedStore',
  ArrivedStore: 'PickedUp',
  PickedUp: 'Delivering',
  Delivering: 'Delivered',
}

const deliveryStatusText: Record<DeliveryTaskStatus, string> = {
  Available: '可接单',
  Accepted: '已接单',
  ArrivedStore: '已到店',
  PickedUp: '已取餐',
  Delivering: '配送中',
  Delivered: '已送达',
}

function App() {
  const [tasks, setTasks] = useState<DeliveryTask[]>(deliveryTasks)
  const [selectedTaskId, setSelectedTaskId] = useState(deliveryTasks[0].id)
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0]

  const availableTasks = tasks.filter((task) => task.status === 'Available').length
  const activeTasks = tasks.filter(
    (task) => task.status !== 'Available' && task.status !== 'Delivered',
  ).length
  const todayIncome = tasks
    .filter((task) => task.status !== 'Available')
    .reduce((total, task) => total + task.fee, 0)
  const averageMinutes = Math.round(
    tasks.reduce((total, task) => total + task.estimatedMinutes, 0) / tasks.length,
  )

  const routeSteps = useMemo(
    () => [
      {
        title: '当前位置',
        description: 'Auckland CBD',
        done: true,
      },
      {
        title: '到店取餐',
        description: selectedTask.pickupAddress,
        done: ['ArrivedStore', 'PickedUp', 'Delivering', 'Delivered'].includes(selectedTask.status),
      },
      {
        title: '送达顾客',
        description: selectedTask.customerAddress,
        done: selectedTask.status === 'Delivered',
      },
    ],
    [selectedTask],
  )

  function advanceTask(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        const nextStatus = nextDeliveryStatus[task.status]

        if (!nextStatus) {
          return task
        }

        return {
          ...task,
          status: nextStatus,
          statusText: deliveryStatusText[nextStatus],
        }
      }),
    )
  }

  return (
    <main className="app-shell rider-app">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">R</div>
          <div>
            <p className="eyebrow">Rider</p>
            <h1>骑手接单台</h1>
          </div>
        </div>
        <div className="search-box">
          <MapPin size={18} strokeWidth={2.4} />
          <span>当前位置：Auckland CBD</span>
        </div>
        <div className="header-pill">
          <Bike size={18} strokeWidth={2.4} />
          在线接单
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span>可接单</span>
          <strong>{availableTasks}</strong>
        </article>
        <article className="metric-card">
          <span>配送中</span>
          <strong>{activeTasks}</strong>
        </article>
        <article className="metric-card">
          <span>今日收入</span>
          <strong>{formatMoney(todayIncome)}</strong>
        </article>
        <article className="metric-card">
          <span>平均送达</span>
          <strong>{averageMinutes}m</strong>
        </article>
      </section>

      <section className="rider-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>配送单</h2>
            <PackageCheck size={20} strokeWidth={2.4} />
          </div>
          <div className="delivery-list">
            {tasks.map((task) => (
              <button
                className={selectedTask.id === task.id ? 'delivery-card selected' : 'delivery-card'}
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                type="button"
              >
                <div>
                  <strong>{task.storeName}</strong>
                  <span>
                    {task.id} · {task.statusText}
                  </span>
                </div>
                <p>{task.customerAddress}</p>
                <div className="delivery-footer">
                  <span>{formatDistance(task.distanceKm)}</span>
                  <strong>{formatMoney(task.fee)}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel task-detail">
          <div className="panel-title">
            <h2>{selectedTask.orderId}</h2>
            <span>{selectedTask.statusText}</span>
          </div>
          <div className="detail-grid">
            <article>
              <MapPin size={18} strokeWidth={2.4} />
              <div>
                <strong>取餐地址</strong>
                <span>{selectedTask.pickupAddress}</span>
              </div>
            </article>
            <article>
              <Navigation size={18} strokeWidth={2.4} />
              <div>
                <strong>送餐地址</strong>
                <span>{selectedTask.customerAddress}</span>
              </div>
            </article>
            <article>
              <ShieldCheck size={18} strokeWidth={2.4} />
              <div>
                <strong>取餐码</strong>
                <span>{selectedTask.pickupCode}</span>
              </div>
            </article>
            <article>
              <Phone size={18} strokeWidth={2.4} />
              <div>
                <strong>顾客电话</strong>
                <span>{selectedTask.customerPhoneMasked}</span>
              </div>
            </article>
          </div>
          <button
            className="primary-button full-width"
            disabled={!nextDeliveryStatus[selectedTask.status]}
            onClick={() => advanceTask(selectedTask.id)}
            type="button"
          >
            <CheckCircle2 size={18} strokeWidth={2.4} />
            {nextDeliveryStatus[selectedTask.status]
              ? `更新为${deliveryStatusText[nextDeliveryStatus[selectedTask.status] as DeliveryTaskStatus]}`
              : '配送已完成'}
          </button>
        </div>

        <div className="panel map-panel">
          <div className="panel-title">
            <h2>路线预览</h2>
            <Route size={20} strokeWidth={2.4} />
          </div>
          <div className="map-preview">
            <div className="route-line"></div>
            <span className="pin current">骑</span>
            <span className="pin pickup">取</span>
            <span className="pin dropoff">送</span>
          </div>
          <div className="route-steps">
            {routeSteps.map((step) => (
              <article className={step.done ? 'done' : ''} key={step.title}>
                <CheckCircle2 size={18} strokeWidth={2.4} />
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="route-summary">
            <span>
              <Clock3 size={16} strokeWidth={2.4} /> 预计 {selectedTask.estimatedMinutes} 分钟
            </span>
            <span>
              <Map size={16} strokeWidth={2.4} /> 后续接 Google Maps
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
