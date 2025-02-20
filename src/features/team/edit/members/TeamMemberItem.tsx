'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { useOnClickOutside } from '@/shared/hooks/useOnClickOutside'
import { fetchWithAuth } from '@/shared/lib/api/fetchWithAuth'
import { useToast } from '@/shared/hooks/useToast'
import { updateMemberType, removeMember } from '../../api/teamApi'
import Tooltip from '@/shared/components/Tooltip'

interface TeamMemberItemProps {
  profileImagePath?: string
  name: string
  position: string
  memberType: 'TEAM_OWNER' | 'TEAM_MANAGER' | 'TEAM_VIEWER'
  majorPosition: string
  isPending?: boolean
  emailId?: string
  teamCode: string
  onMemberUpdate?: () => void
  myRole: {
    isTeamOwner: boolean
    isTeamManager: boolean
  }
}

export function TeamMemberItem({
  profileImagePath,
  name,
  position,
  memberType,
  majorPosition,
  isPending,
  emailId,
  teamCode,
  onMemberUpdate,
  myRole,
}: TeamMemberItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  const canManageRole = myRole.isTeamOwner || (myRole.isTeamManager && memberType === 'TEAM_VIEWER')
  const canDelete = myRole.isTeamOwner || (myRole.isTeamManager && memberType === 'TEAM_VIEWER')

  const getButtonStyle = (type: 'manager' | 'viewer' | 'delete') => {
    const isDisabled = (() => {
      if (type === 'delete') {
        return !canDelete && !isPending
      }
      if (isPending) return true
      if (memberType === 'TEAM_OWNER') return true
      if (!canManageRole) return true
      if (type === 'manager' && memberType === 'TEAM_MANAGER') return true
      if (type === 'viewer' && memberType === 'TEAM_VIEWER') return true
      return false
    })()

    return `flex w-full items-center px-4 py-2 text-sm ${
      isDisabled ? 'cursor-not-allowed text-grey40' : type === 'delete' ? 'text-[#FF345F]' : 'text-grey80'
    } hover:bg-grey20`
  }

  useOnClickOutside({
    refs: [menuRef, buttonRef],
    handler: () => setShowMenu(false),
    isEnabled: showMenu,
  })

  const handleUpdateMemberType = async (emailId: string, newType: string) => {
    try {
      await updateMemberType(teamCode, emailId, newType)
      toast.success('팀원 권한이 변경되었습니다.')
      setShowMenu(false)
      onMemberUpdate?.()
    } catch (error) {
      console.error('Error updating member type:', error)
      toast.alert('팀원 권한 변경에 실패했습니다.')
    }
  }

  const handleRemoveMember = async (emailId: string) => {
    try {
      await removeMember(teamCode, emailId, isPending || false)
      toast.success('팀원이 삭제되었습니다.')
      setShowMenu(false)
      onMemberUpdate?.()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.alert('팀원 삭제에 실패했습니다.')
    }
  }

  const handleUpdateToOwner = async (emailId: string) => {
    try {
      await updateMemberType(teamCode, emailId, 'TEAM_OWNER')
      toast.success('대표가 변경되었습니다.')
      setShowMenu(false)
      onMemberUpdate?.()
    } catch (error) {
      console.error('Error updating to owner:', error)
      toast.alert('대표 변경에 실패했습니다.')
    }
  }

  const renderMenuItems = () => {
    return (
      <>
        {myRole.isTeamOwner && (
          <button
            className={getButtonStyle('manager')}
            onClick={() => !isPending && emailId && memberType !== 'TEAM_OWNER' && handleUpdateToOwner(emailId)}
            disabled={isPending || memberType === 'TEAM_OWNER'}
          >
            대표로 설정
          </button>
        )}
        <button
          className={getButtonStyle('manager')}
          onClick={() =>
            !isPending &&
            canManageRole &&
            emailId &&
            memberType !== 'TEAM_MANAGER' &&
            handleUpdateMemberType(emailId, 'TEAM_MANAGER')
          }
          disabled={isPending || !canManageRole || memberType === 'TEAM_OWNER' || memberType === 'TEAM_MANAGER'}
        >
          관리자로 설정
        </button>
        <button
          className={getButtonStyle('viewer')}
          onClick={() =>
            !isPending &&
            canManageRole &&
            emailId &&
            memberType !== 'TEAM_VIEWER' &&
            handleUpdateMemberType(emailId, 'TEAM_VIEWER')
          }
          disabled={isPending || !canManageRole || memberType === 'TEAM_OWNER' || memberType === 'TEAM_VIEWER'}
        >
          뷰어로 설정
        </button>
        <button
          className={getButtonStyle('delete')}
          onClick={() => emailId && handleRemoveMember(emailId)}
          disabled={!isPending && (!canDelete || memberType === 'TEAM_OWNER')}
        >
          삭제하기
        </button>
      </>
    )
  }

  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-5 md:px-9 md:py-5">
      <div className="flex items-center gap-5">
        <div className="relative h-[52px] w-[52px] rounded-lg">
          <Image
            src={profileImagePath || '/common/default_profile.svg'}
            fill
            alt="profile"
            className="rounded-lg object-cover"
          />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="flex justify-start font-semibold text-grey80">{isPending ? emailId : name}</span>
            {!isPending && (
              <>
                {majorPosition && (
                  <>
                    <span className="text-xs text-grey50">|</span>
                    <span className="text-sm text-grey80">{majorPosition}</span>
                  </>
                )}
              </>
            )}
          </div>
          <span className="flex items-center gap-2 text-sm text-grey50">
            {isPending ? (
              '(대기중)'
            ) : memberType === 'TEAM_OWNER' ? (
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-grey10 px-[0.62rem] py-1 text-main">대표/관리자</div>
                <Tooltip
                  text={[
                    '대표는 팀을 대표해 채팅하고 팀 구성원을 삭제할 수 있는 권한을 가져요',
                    '관리자는 팀원을 초대할 수 있어요',
                  ]}
                  className="left-44 w-[18.4rem]"
                />
              </div>
            ) : memberType === 'TEAM_MANAGER' ? (
              <div className="rounded-lg bg-grey10 px-[0.62rem] py-1 text-main">관리자</div>
            ) : (
              <div className="rounded-lg bg-grey10 px-[0.62rem] py-1 text-grey80">뷰어</div>
            )}
          </span>
        </div>
      </div>
      {(myRole.isTeamOwner || myRole.isTeamManager) && (
        <div className="relative">
          <div ref={buttonRef} onClick={() => setShowMenu(!showMenu)} className="cursor-pointer">
            <Image src="/common/icons/more_row.svg" width={24} height={24} alt="menu" />
          </div>

          {showMenu && (
            <div ref={menuRef} className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg bg-white py-2 shadow-lg">
              {renderMenuItems()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
