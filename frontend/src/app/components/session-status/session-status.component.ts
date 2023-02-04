import {Component, Input, OnInit} from '@angular/core';
import {SessionStatus} from '../../api.service';

@Component({
  selector: 't-session-status',
  templateUrl: './session-status.component.html',
  styleUrls: ['./session-status.component.scss']
})
export class SessionStatusComponent implements OnInit {
  @Input() sessionStatus: SessionStatus;

  constructor() {
  }

  ngOnInit(): void {
  }

}
