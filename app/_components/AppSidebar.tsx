import React from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Calendar, Home, Inbox, Megaphone, Search, Settings, Wallet2 } from "lucide-react"
import Image from 'next/image'
import { useParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useAuthContext } from '../provider'
import ProfileAvatar from './ProfileAvatar'

const items = [
    {
        title: "Home",
        url: "/app",
        icon: Home,
    },
    {
        title: "Creative Tools",
        url: "/creative-ai-tools",
        icon: Inbox,
    },
    {
        title: "My Ads",
        url: "/my-ads",
        icon: Megaphone,
    },
    {
        title: "Upgrade",
        url: "#",
        icon: Wallet2,
    },
    {
        title: "Profile",
        url: "#",
        icon: Settings,
    },
]

export function AppSidebar() {
    const path = usePathname();
    const { user } = useAuthContext();
    return (
        <Sidebar>
        
            <SidebarContent>
                <SidebarGroup>

                    <SidebarGroupContent>
                        <SidebarMenu className='mt-5'>
                            {items.map((item, index) => (
                                // <SidebarMenuItem key={item.title} className='p-2'>
                                //     <SidebarMenuButton asChild className=''>
                                <a href={item.url} key={index} className={`p-2 text-lg flex gap-2 items-center
                                 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg
                                 ${path.includes(item.url) && 'bg-gray-100 dark:bg-zinc-800'}`}>
                                    <item.icon className='h-5 w-5' />
                                    <span>{item.title}</span>
                                </a>
                                //     </SidebarMenuButton>
                                // </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                {!user ? <Link href={'/login'} className='w-full'>
                    <Button className='w-full'>Sign In</Button>
                </Link>
                    : <div className='flex justify-between items-center p-2 px-4 bg-zinc-800 rounded-lg'>
                        <h2>Profile</h2>
                        <ProfileAvatar />
                    </div>}
            </SidebarFooter>
        </Sidebar>
    )
}