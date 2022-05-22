def show_calendar(zeller, end_of_month)
  calendar     = []
  calendar_row = []
  puts %w[日 月 火 水 木 金 土].join(" ")
  (7*6).times do |i|
    break if zeller + end_of_month <= 35 && i >= 35

    if i >= zeller && i - zeller < end_of_month
      calendar_row << i - zeller + 1
    else
      calendar_row << '_'
    end

    if i > 0 && (i + 1) % 7 == 0
      calendar << calendar_row.join(' ')
      calendar_row = []
    end
  end
  puts calendar.join("\n")
end

show_calendar(5, 30) # 金曜日
puts ""
show_calendar(6, 31) # 土曜日
