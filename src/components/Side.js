import React, {useEffect, useState} from 'react'

export default function Side() {
  return (
    <div className='bg-gray-800 text-white w-1/5 h-screen p-4'>
      <h1 className='text-2xl text-blue-500 font-bold mb-6'>MSI</h1>
      <ul>
        <li className='mb-4'>Home</li>
        <li className='mb-4'>Profile</li>
        <li className='mb-4'>Settings</li>
        <li className='mb-4'>LogOut</li>
      </ul>
    </div>
  )
}
